import { NextRequest, NextResponse } from "next/server";
import { DataSet, LLMAnalysisResponse, VisualizationSpec } from "@/lib/types";

// Constants for chunking
const MAX_ROWS_PER_CHUNK = 50; // Smaller chunks for better processing
const MAX_COLUMNS_PER_CHUNK = 20; // Smaller column chunks
const MAX_TOKENS_ESTIMATE = 50000; // Conservative estimate for context window
const MAX_CHUNKS_TO_PROCESS = 10; // Limit parallel processing to avoid overwhelming API
const SAMPLE_SIZE_FOR_LARGE_DATASETS = 500; // Much smaller sample for extremely large datasets

// Helper to estimate token count (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Helper to chunk large datasets
function chunkDataset(dataset: DataSet) {
  const totalRows = dataset.rows.length;
  const totalCols = dataset.schema.fields.length;

  // If dataset is small enough, return as-is
  if (totalRows <= MAX_ROWS_PER_CHUNK && totalCols <= MAX_COLUMNS_PER_CHUNK) {
    return [{ dataset, isChunked: false }];
  }

  // For extremely large datasets, use sampling
  if (totalRows > SAMPLE_SIZE_FOR_LARGE_DATASETS) {
    console.log(
      `Dataset has ${totalRows} rows. Sampling ${SAMPLE_SIZE_FOR_LARGE_DATASETS} rows for analysis.`
    );
    const sampledRows = [];
    const sampleInterval = Math.floor(
      totalRows / SAMPLE_SIZE_FOR_LARGE_DATASETS
    );
    for (let i = 0; i < totalRows; i += sampleInterval) {
      sampledRows.push(dataset.rows[i]);
      if (sampledRows.length >= SAMPLE_SIZE_FOR_LARGE_DATASETS) break;
    }
    dataset = {
      ...dataset,
      rows: sampledRows,
      schema: {
        ...dataset.schema,
        rowCount: sampledRows.length,
      },
    };
  }

  // Recalculate after sampling
  const actualRows = dataset.rows.length;
  const actualCols = dataset.schema.fields.length;

  // Check again after sampling
  if (actualRows <= MAX_ROWS_PER_CHUNK && actualCols <= MAX_COLUMNS_PER_CHUNK) {
    return [{ dataset, isChunked: false }];
  }

  const chunks: any[] = [];
  const colChunks = Math.ceil(actualCols / MAX_COLUMNS_PER_CHUNK);
  const rowChunks = Math.ceil(actualRows / MAX_ROWS_PER_CHUNK);

  console.log(
    `Chunking dataset: ${rowChunks} row chunks × ${colChunks} column chunks = ${
      rowChunks * colChunks
    } total chunks`
  );
  for (let colIdx = 0; colIdx < colChunks; colIdx++) {
    const colStart = colIdx * MAX_COLUMNS_PER_CHUNK;
    const colEnd = Math.min((colIdx + 1) * MAX_COLUMNS_PER_CHUNK, actualCols);
    const chunkFields = dataset.schema.fields.slice(colStart, colEnd);
    const fieldNames = chunkFields.map((f) => f.name);

    for (let rowIdx = 0; rowIdx < rowChunks; rowIdx++) {
      const rowStart = rowIdx * MAX_ROWS_PER_CHUNK;
      const rowEnd = Math.min((rowIdx + 1) * MAX_ROWS_PER_CHUNK, actualRows);
      const chunkRows = dataset.rows.slice(rowStart, rowEnd).map((row) => {
        const newRow: any = {};
        fieldNames.forEach((name) => {
          newRow[name] = row[name];
        });
        return newRow;
      });

      chunks.push({
        dataset: {
          source: dataset.source,
          schema: {
            fields: chunkFields,
            rowCount: chunkRows.length,
          },
          rows: chunkRows,
        },
        isChunked: true,
        chunkInfo: {
          rowRange: `${rowStart}-${rowEnd}`,
          colRange: `${colStart}-${colEnd}`,
          totalRows: actualRows,
          totalCols: actualCols,
        },
      });
    }
  }

  return chunks;
}

// Unified analysis call for multiple chunks
async function analyzeWithUnification(
  chunks: any[],
  query: string,
  config: any
) {
  if (chunks.length === 1 && !chunks[0].isChunked) {
    return await analyzeChunk(chunks[0].dataset, query, config);
  }

  console.log(`Analyzing ${chunks.length} chunks separately...`);

  // If too many chunks, process in batches to avoid overwhelming API
  let chunkResults = [];
  if (chunks.length > MAX_CHUNKS_TO_PROCESS) {
    console.log(
      `Processing ${chunks.length} chunks in batches of ${MAX_CHUNKS_TO_PROCESS}`
    );
    for (let i = 0; i < chunks.length; i += MAX_CHUNKS_TO_PROCESS) {
      const batch = chunks.slice(
        i,
        Math.min(i + MAX_CHUNKS_TO_PROCESS, chunks.length)
      );
      console.log(
        `Processing batch ${
          Math.floor(i / MAX_CHUNKS_TO_PROCESS) + 1
        }/${Math.ceil(chunks.length / MAX_CHUNKS_TO_PROCESS)}`
      );
      const batchResults = await Promise.all(
        batch.map((chunk) =>
          analyzeChunk(chunk.dataset, query, config, chunk.chunkInfo)
        )
      );
      chunkResults.push(...batchResults);
    }
  } else {
    // Analyze all chunks in parallel
    chunkResults = await Promise.all(
      chunks.map((chunk) =>
        analyzeChunk(chunk.dataset, query, config, chunk.chunkInfo)
      )
    );
  }

  // Unify results using another LLM call
  console.log("Unifying chunk results...");
  return await unifyChunkResults(chunkResults, query, config);
}

async function analyzeChunk(
  dataset: DataSet,
  query: string,
  config: any,
  chunkInfo?: any
) {
  // Prepare dataset summary for LLM
  const schemaSummary = dataset.schema.fields
    .map(
      (f: any) => `- ${f.name} (${f.type})${f.nullable ? " [nullable]" : ""}`
    )
    .join("\n");

  const sampleData = dataset.schema.sampleRows || dataset.rows.slice(0, 5);

  const chunkContext = chunkInfo
    ? `\n\nNOTE: This is a chunk of a larger dataset (rows ${chunkInfo.rowRange}, columns ${chunkInfo.colRange} out of ${chunkInfo.totalRows} total rows and ${chunkInfo.totalCols} total columns).`
    : "";

  const systemPrompt = `You are a data analysis assistant. You have access to a dataset with the following schema:

${schemaSummary}

Total rows in this data: ${dataset.schema.rowCount}${chunkContext}

Sample data:
${JSON.stringify(sampleData, null, 2)}

Your task is to:
1. Answer the user's query based on the data
2. Suggest relevant visualizations using Plotly specification, only if the user has asked for it in the query.
3. Provide follow-up questions

Respond in JSON format:
{
  "answer": "Your analysis here",
  "visualizations": [
    {
      "id": "unique-id",
  "title": "Chart Title",
  "description": "What this chart shows",
  "plotlyData": [
    {
      "x": [...],
      "y": [...],
      "type": "bar|scatter|line|pie|box|histogram|heatmap",
      "mode": "lines|markers|lines+markers",
      "name": "Series Name",
      "marker": { "color": "blue" }
    }
  ],
  "plotlyLayout": {
    "xaxis": { "title": "X Axis Label" },
    "yaxis": { "title": "Y Axis Label" },
    "title": "Chart Title"
  }
    }
  ],
  "followUps": ["Question 1?", "Question 2?"]
}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: query },
  ];

  // Call OpenRouter API
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.referer || "https://your-app.com",
        "X-Title": config.title || "Data Analysis App",
      },
      body: JSON.stringify({
        model: config.model || "x-ai/grok-4-fast",
        messages,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  // Extract JSON from response
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
    content.match(/```\s*([\s\S]*?)```/) || [null, content];

  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonMatch[1] || content);
  } catch {
    // Fallback if JSON parsing fails
    parsed = {
      answer: content,
      visualizations: [],
      followUps: [],
    };
  }

  return {
    answer: parsed.answer || content,
    visualizations: parsed.visualizations || [],
    followUps: parsed.followUps || [],
  };
}

async function unifyChunkResults(
  chunkResults: any[],
  query: string,
  config: any
) {
  const unificationPrompt = `You are a data analysis expert. Multiple analyses have been performed on different chunks of a large dataset. Your task is to synthesize these into a single cohesive answer.

User's original question: ${query}

Chunk analyses:
${chunkResults
  .map(
    (result, idx) => `
Chunk ${idx + 1}:
${result.answer}
`
  )
  .join("\n")}

Provide a unified, comprehensive answer that:
1. Combines insights from all chunks
2. Identifies patterns across the entire dataset
3. Reconciles any conflicting information
4. Provides a clear, actionable summary

Also suggest 2-3 follow-up questions based on the complete analysis.

Respond in JSON format:
{
  "answer": "Your unified analysis here",
  "followUps": ["Question 1?", "Question 2?", "Question 3?"]
}`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.referer || "https://your-app.com",
        "X-Title": config.title || "Data Analysis App",
      },
      body: JSON.stringify({
        model: config.model || "x-ai/grok-4-fast",
        messages: [{ role: "user", content: unificationPrompt }],
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Unification API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
    content.match(/```\s*([\s\S]*?)```/) || [null, content];

  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonMatch[1] || content);
  } catch {
    parsed = {
      answer: content,
      followUps: [],
    };
  }

  // Collect all visualizations from chunks
  const allVisualizations = chunkResults.flatMap((r) => r.visualizations || []);

  return {
    answer: parsed.answer || content,
    visualizations: allVisualizations.slice(0, 10), // Limit to 10 best visualizations
    followUps: parsed.followUps || [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { dataset, query, config } = await request.json();

    if (!dataset || !query) {
      return NextResponse.json(
        { error: "Missing required fields: dataset and query are required" },
        { status: 400 }
      );
    }

    if (!config?.apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing API key. Please configure your OpenRouter API key in settings.",
        },
        { status: 400 }
      );
    }

    // Chunk the dataset if needed
    const chunks = chunkDataset(dataset);
    console.log(`Processing ${chunks.length} chunk(s) for analysis`);

    // Analyze with chunking support
    const result = await analyzeWithUnification(chunks, query, config);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in analyze API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
