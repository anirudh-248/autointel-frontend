import { NextRequest, NextResponse } from "next/server";
import { DataSet, LLMReportResponse } from "@/lib/types";

// Chunking constants
const MAX_ROWS_PER_CHUNK = 50;
const MAX_COLUMNS_PER_CHUNK = 20;
const MAX_CHUNKS_TO_PROCESS = 10;
const SAMPLE_SIZE_FOR_LARGE_DATASETS = 500;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkDataset(dataset: DataSet) {
  const totalRows = dataset.rows.length;
  const totalCols = dataset.schema.fields.length;

  if (totalRows <= MAX_ROWS_PER_CHUNK && totalCols <= MAX_COLUMNS_PER_CHUNK) {
    return [{ dataset, isChunked: false }];
  }

  // For extremely large datasets, use sampling
  if (totalRows > SAMPLE_SIZE_FOR_LARGE_DATASETS) {
    console.log(
      `Dataset has ${totalRows} rows. Sampling ${SAMPLE_SIZE_FOR_LARGE_DATASETS} rows for report generation.`
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
  const numRowChunks = Math.ceil(actualRows / MAX_ROWS_PER_CHUNK);
  const numColChunks = Math.ceil(actualCols / MAX_COLUMNS_PER_CHUNK);

  console.log(
    `Chunking dataset for report: ${numRowChunks} row chunks × ${numColChunks} column chunks = ${
      numRowChunks * numColChunks
    } total chunks`
  );

  for (let colChunk = 0; colChunk < numColChunks; colChunk++) {
    const colStart = colChunk * MAX_COLUMNS_PER_CHUNK;
    const colEnd = Math.min(colStart + MAX_COLUMNS_PER_CHUNK, actualCols);
    const fieldsChunk = dataset.schema.fields.slice(colStart, colEnd);

    for (let rowChunk = 0; rowChunk < numRowChunks; rowChunk++) {
      const rowStart = rowChunk * MAX_ROWS_PER_CHUNK;
      const rowEnd = Math.min(rowStart + MAX_ROWS_PER_CHUNK, actualRows);
      const rowsChunk = dataset.rows.slice(rowStart, rowEnd);

      const filteredRows = rowsChunk.map((row: any) => {
        const newRow: any = {};
        fieldsChunk.forEach((field: any) => {
          newRow[field.name] = row[field.name];
        });
        return newRow;
      });

      chunks.push({
        dataset: {
          schema: {
            ...dataset.schema,
            fields: fieldsChunk,
            rowCount: filteredRows.length,
          },
          rows: filteredRows,
        },
        isChunked: true,
        chunkInfo: {
          rowRange: `${rowStart + 1}-${rowEnd}`,
          colRange: `${colStart + 1}-${colEnd}`,
          totalRows: actualRows,
          totalCols: actualCols,
        },
      });
    }
  }

  return chunks;
}

async function generateChunkReport(
  dataset: DataSet,
  query: string,
  config: any,
  selectedVisualizations?: string[],
  chunkInfo?: any
): Promise<string> {
  const schemaSummary = dataset.schema.fields
    .map((f: any) => `- ${f.name} (${f.type})`)
    .join("\n");

  const sampleData = dataset.schema.sampleRows || dataset.rows.slice(0, 10);

  const reportQuery =
    query ||
    "Generate a detailed, comprehensive analytical report of this dataset";

  const chunkContext = chunkInfo
    ? `\n\nNOTE: This is a chunk of a larger dataset (rows ${chunkInfo.rowRange}, columns ${chunkInfo.colRange} out of ${chunkInfo.totalRows} total rows and ${chunkInfo.totalCols} total columns). Focus your analysis on this subset.`
    : "";

  const systemPrompt = `You are a data analyst creating professional report sections. Generate a detailed analytical section based on this dataset chunk.

Selected Visualizations: ${
    selectedVisualizations && selectedVisualizations.length > 0
      ? selectedVisualizations.join(", ")
      : "None"
  }.

The dataset is provided in JSON format with the following schema:
Dataset Schema:
${schemaSummary}

Total rows in this chunk: ${dataset.schema.rowCount}${chunkContext}

Sample data:
${JSON.stringify(sampleData, null, 2)}

Create detailed analysis sections that include:
1. Data Overview for this chunk (schema, row counts, data types)
2. Key Findings and Insights
3. Statistical Analysis
4. Trends and Patterns observed in this data subset
5. Chart specifications (but do NOT include full HTML - just describe what charts would be useful)

Return your analysis as structured text with clear section headers. Focus on insights, patterns, and statistical findings.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: reportQuery },
  ];

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
  return data.choices[0]?.message?.content || "";
}

async function unifyReportSections(
  chunkReports: string[],
  dataset: DataSet,
  query: string,
  config: any,
  selectedVisualizations?: string[]
): Promise<string> {
  const unificationPrompt = `You are a data analyst creating a comprehensive professional HTML report. Multiple analyses have been performed on different chunks of a large dataset. Your task is to synthesize these into a single, cohesive, beautifully formatted HTML report.

User's original request: ${
    query || "Generate a comprehensive analytical report"
  }

Chunk analyses:
${chunkReports
  .map(
    (report, idx) => `
=== Chunk ${idx + 1} Analysis ===
${report}
`
  )
  .join("\n")}

Dataset Overview:
- Total rows: ${dataset.schema.rowCount}
- Total columns: ${dataset.schema.fields.length}
- Columns: ${dataset.schema.fields.map((f: any) => f.name).join(", ")}

Create a comprehensive HTML report that includes:
1. Executive Summary (synthesized from all chunks)
2. Data Overview (full dataset schema, row counts, data types)
3. Key Findings and Insights (combined from all chunks)
4. Statistical Analysis (aggregated insights)
5. Trends and Patterns (identified across the entire dataset)
6. Recommendations (based on complete analysis)
7. Interactive charts using Chart.js

CRITICAL CHART RENDERING INSTRUCTIONS:
- For PDF compatibility, wrap ALL chart initialization code in a DOMContentLoaded event listener
- Each chart MUST have a unique ID
- Place all chart scripts at the END of the body, just before </body>
- Use this exact pattern for EVERY chart:

<div class="chart-container" style="position: relative; height: 400px; margin: 30px 0;">
  <canvas id="uniqueChartId"></canvas>
</div>

And at the end of the document, inside a single script tag:
<script>
document.addEventListener('DOMContentLoaded', function() {
  if (typeof Chart !== 'undefined') {
    const ctx1 = document.getElementById('uniqueChartId').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Label1', 'Label2'],
        datasets: [{
          label: 'Dataset Label',
          data: [12, 19],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
});
</script>

Return ONLY the HTML body content (no <!DOCTYPE>, <html>, <head>, or <body> tags - just the inner content).`;

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
  let htmlContent = data.choices[0]?.message?.content || "";

  // Remove markdown code blocks if present
  htmlContent = htmlContent.replace(/```html\s*/g, "").replace(/```\s*$/g, "");

  return htmlContent;
}

async function generateReportWithUnification(
  chunks: any[],
  query: string,
  config: any,
  selectedVisualizations?: string[]
): Promise<string> {
  if (chunks.length === 1) {
    return generateChunkReport(
      chunks[0].dataset,
      query,
      config,
      selectedVisualizations
    );
  }

  console.log(`Generating report from ${chunks.length} chunks in parallel`);

  // Generate reports for all chunks in parallel
  const chunkReports = await Promise.all(
    chunks.map((chunk) =>
      generateChunkReport(
        chunk.dataset,
        query,
        config,
        selectedVisualizations,
        chunk.chunkInfo
      )
    )
  );

  // Unify all reports into a single comprehensive report
  return unifyReportSections(
    chunkReports,
    chunks[0].dataset,
    query,
    config,
    selectedVisualizations
  );
}

export async function POST(request: NextRequest) {
  try {
    const { dataset, query, config, selectedVisualizations } =
      await request.json();

    if (!dataset || !config?.apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Chunk the dataset if needed
    const chunks = chunkDataset(dataset);
    console.log(`Processing ${chunks.length} chunk(s) for report generation`);

    // Generate report with chunking support
    let htmlContent = await generateReportWithUnification(
      chunks,
      query,
      config,
      selectedVisualizations
    );

    // Wrap in full HTML structure
    if (!htmlContent.includes("<!DOCTYPE") && !htmlContent.includes("<html")) {
      const currentDate = new Date().toLocaleString();
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Analysis Report - AutoIntel</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            padding: 40px; 
            max-width: 1200px; 
            margin: 0 auto; 
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 10px; 
            margin-bottom: 30px;
        }
        h2 { 
            color: #34495e; 
            margin-top: 40px; 
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        h3 {
            color: #555;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 20px 0; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }
        th { 
            background-color: #3498db; 
            color: white; 
            font-weight: 600;
        }
        tr:nth-child(even) { 
            background-color: #f9f9f9; 
        }
        tr:hover {
            background-color: #f0f0f0;
        }
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            position: relative;
            height: 400px;
        }
        .chart-container canvas {
            width: 100% !important;
            height: 100% !important;
        }
        .watermark {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            color: #999;
            font-size: 14px;
        }
        .watermark strong {
            color: #3498db;
            font-size: 16px;
        }
        .section {
            margin-bottom: 40px;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 25px;
        }
        li {
            margin: 8px 0;
        }
        p {
            margin: 10px 0;
        }
        @media print {
            body { 
                background: white;
                padding: 20px;
            }
            .container { 
                box-shadow: none;
                padding: 0;
            }
            .chart-container {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
        @page {
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent}
        <div class="watermark">
            <strong>AutoIntel</strong><br>
            Generated on ${currentDate}
        </div>
    </div>
</body>
</html>`;
    } else {
      // If HTML structure exists, ensure Chart.js is included
      if (!htmlContent.includes("chart.js")) {
        htmlContent = htmlContent.replace(
          "</head>",
          '    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>\n</head>'
        );
      }

      // Ensure proper chart container styling exists
      if (!htmlContent.includes(".chart-container")) {
        htmlContent = htmlContent.replace(
          "</style>",
          `
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            position: relative;
            height: 400px;
        }
        .chart-container canvas {
            width: 100% !important;
            height: 100% !important;
        }
        @media print {
            .chart-container {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
        </style>`
        );
      }
    }

    const result: LLMReportResponse = {
      htmlMarkdown: htmlContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        rowsAnalyzed: dataset.schema.rowCount,
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in LLM report API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
