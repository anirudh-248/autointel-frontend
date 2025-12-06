import { NextRequest, NextResponse } from "next/server";
import { DataSet, VisualizationSpec } from "@/lib/types";

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

  // If dataset is small enough, return as single chunk
  if (totalRows <= MAX_ROWS_PER_CHUNK && totalCols <= MAX_COLUMNS_PER_CHUNK) {
    return [{ dataset, isChunked: false }];
  }

  // For extremely large datasets, use sampling
  if (totalRows > SAMPLE_SIZE_FOR_LARGE_DATASETS) {
    console.log(
      `Dataset has ${totalRows} rows. Sampling ${SAMPLE_SIZE_FOR_LARGE_DATASETS} rows for visualization.`
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
    `Chunking dataset: ${numRowChunks} row chunks × ${numColChunks} column chunks = ${
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

      // Filter rows to only include columns in this chunk
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

async function visualizeChunk(
  dataset: DataSet,
  config: any,
  chunkInfo?: any
): Promise<VisualizationSpec[]> {
  const schemaSummary = dataset.schema.fields
    .map((f: any) => `- ${f.name} (${f.type})`)
    .join("\n");

  const sampleData = dataset.schema.sampleRows || dataset.rows.slice(0, 10);

  const chunkContext = chunkInfo
    ? `\n\nNOTE: This is a chunk of a larger dataset (rows ${chunkInfo.rowRange}, columns ${chunkInfo.colRange} out of ${chunkInfo.totalRows} total rows and ${chunkInfo.totalCols} total columns). Focus on visualizations relevant to this subset.`
    : "";

  const systemPrompt = `You are a data visualization expert. Analyze this dataset and suggest 4 diverse visualizations using Plotly.

Dataset Schema:
${schemaSummary}

Total rows: ${dataset.schema.rowCount}${chunkContext}

Sample data (first 10 rows):
${JSON.stringify(sampleData, null, 2)}

Create 6-10 diverse visualizations (bar, line, scatter, pie, box, histogram, 3D charts etc.) that best represent the data patterns.

Respond with a JSON array of visualization specs. Each spec should have:
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

IMPORTANT: 
- Include actual data values in the plotlyData arrays, not empty arrays
- Use the actual column names from the schema
- Choose appropriate chart types for the data
- For categorical data, use bar or pie charts
- For time series, use line charts
- For distributions, use histograms or box plots
- Keep the data arrays reasonable (sample if needed)

Return ONLY a JSON array, no markdown formatting.`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: "Suggest the best 6-10 visualizations for this dataset",
    },
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
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  // Extract JSON array
  let visualizations: VisualizationSpec[] = [];
  try {
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)```/) ||
      content.match(/```\s*([\s\S]*?)```/) ||
      content.match(/\[[\s\S]*\]/);

    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    visualizations = JSON.parse(jsonStr);

    visualizations = visualizations.map((viz: any, idx: number) => ({
      id: viz.id || `viz-${idx + 1}`,
      title: viz.title || `Visualization ${idx + 1}`,
      description: viz.description || "",
      plotlyData: viz.plotlyData || [],
      plotlyLayout: viz.plotlyLayout || {},
      plotlyConfig: viz.plotlyConfig || {},
    }));

    if (visualizations.length === 0) {
      visualizations = createDefaultVisualizations(dataset);
    }
  } catch (e) {
    console.error("Failed to parse visualizations:", e);
    visualizations = createDefaultVisualizations(dataset);
  }

  return visualizations;
}

async function unifyVisualizations(
  chunkVisualizations: VisualizationSpec[][],
  config: any
): Promise<VisualizationSpec[]> {
  // Flatten all visualizations
  const allViz = chunkVisualizations.flat();

  // Remove duplicates based on title similarity
  const uniqueViz: VisualizationSpec[] = [];
  const seenTitles = new Set<string>();

  for (const viz of allViz) {
    const normalizedTitle = viz.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueViz.push(viz);
    }
  }

  // If we have too many visualizations, use LLM to select the best ones
  if (uniqueViz.length > 10) {
    try {
      const selectionPrompt = `You have ${
        uniqueViz.length
      } visualizations from different chunks of a large dataset. Select the 10 most diverse and informative ones.

Available visualizations:
${uniqueViz
  .map((v, idx) => `${idx + 1}. ${v.title}: ${v.description}`)
  .join("\n")}

Return a JSON array of indices (0-based) for the 10 best visualizations. Example: [0, 2, 5, 7, ...]

Return ONLY the JSON array, no other text.`;

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
            messages: [{ role: "user", content: selectionPrompt }],
            temperature: 0.3,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";
        const jsonMatch =
          content.match(/```json\s*([\s\S]*?)```/) ||
          content.match(/```\s*([\s\S]*?)```/) ||
          content.match(/\[[\s\S]*\]/);
        const indices = JSON.parse(
          jsonMatch ? jsonMatch[1] || jsonMatch[0] : content
        );
        return indices.map((idx: number) => uniqueViz[idx]).filter(Boolean);
      }
    } catch (e) {
      console.error("Failed to select best visualizations:", e);
    }
  }

  // Return first 10 if no LLM selection
  return uniqueViz.slice(0, 10);
}

async function visualizeWithUnification(
  chunks: any[],
  config: any
): Promise<VisualizationSpec[]> {
  if (chunks.length === 1) {
    return visualizeChunk(chunks[0].dataset, config);
  }

  console.log(`Visualizing ${chunks.length} chunks in parallel`);

  // Visualize all chunks in parallel
  const chunkVisualizations = await Promise.all(
    chunks.map((chunk) =>
      visualizeChunk(chunk.dataset, config, chunk.chunkInfo)
    )
  );

  // Unify visualizations
  return unifyVisualizations(chunkVisualizations, config);
}

export async function POST(request: NextRequest) {
  try {
    const { dataset, config } = await request.json();

    if (!dataset || !config?.apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Chunk the dataset if needed
    const chunks = chunkDataset(dataset);
    console.log(`Processing ${chunks.length} chunk(s) for visualization`);

    // Visualize with chunking support
    const visualizations = await visualizeWithUnification(chunks, config);

    return NextResponse.json({ visualizations });
  } catch (error: any) {
    console.error("Error in LLM visualize API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to create default visualizations
function createDefaultVisualizations(dataset: DataSet): VisualizationSpec[] {
  const visualizations: VisualizationSpec[] = [];
  const fields = dataset.schema.fields;
  const rows = dataset.rows.slice(0, 50); // Use first 50 rows

  // Find numeric and categorical columns
  const numericCols = fields.filter((f: any) => f.type === "number");
  const categoricalCols = fields.filter((f: any) => f.type === "string");
  const dateCols = fields.filter((f: any) => f.type === "date");

  // 1. Bar chart - first categorical vs first numeric
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const catCol = categoricalCols[0].name;
    const numCol = numericCols[0].name;

    const grouped: Record<string, number> = {};
    rows.forEach((row: any) => {
      const cat = String(row[catCol] || "Unknown");
      const val = Number(row[numCol]) || 0;
      grouped[cat] = (grouped[cat] || 0) + val;
    });

    visualizations.push({
      id: "viz-1",
      title: `${numCol} by ${catCol}`,
      description: `Bar chart showing ${numCol} aggregated by ${catCol}`,
      plotlyData: [
        {
          x: Object.keys(grouped),
          y: Object.values(grouped),
          type: "bar",
          marker: { color: "#3b82f6" },
        },
      ],
      plotlyLayout: {
        xaxis: { title: catCol },
        yaxis: { title: numCol },
      },
    });
  }

  // 2. Line chart - time series or first two numerics
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0].name;
    const numCol = numericCols[0].name;

    visualizations.push({
      id: "viz-2",
      title: `${numCol} over Time`,
      description: `Time series of ${numCol}`,
      plotlyData: [
        {
          x: rows.map((r: any) => r[dateCol]),
          y: rows.map((r: any) => Number(r[numCol]) || 0),
          type: "scatter",
          mode: "lines+markers",
          marker: { color: "#10b981" },
        },
      ],
      plotlyLayout: {
        xaxis: { title: dateCol },
        yaxis: { title: numCol },
      },
    });
  } else if (numericCols.length >= 2) {
    const col1 = numericCols[0].name;
    const col2 = numericCols[1].name;

    visualizations.push({
      id: "viz-2",
      title: `${col1} vs ${col2}`,
      description: `Scatter plot of ${col1} vs ${col2}`,
      plotlyData: [
        {
          x: rows.map((r: any) => Number(r[col1]) || 0),
          y: rows.map((r: any) => Number(r[col2]) || 0),
          type: "scatter",
          mode: "markers",
          marker: { color: "#10b981", size: 8 },
        },
      ],
      plotlyLayout: {
        xaxis: { title: col1 },
        yaxis: { title: col2 },
      },
    });
  }

  // 3. Histogram - first numeric column
  if (numericCols.length > 0) {
    const numCol = numericCols[0].name;

    visualizations.push({
      id: "viz-3",
      title: `Distribution of ${numCol}`,
      description: `Histogram showing the distribution of ${numCol}`,
      plotlyData: [
        {
          x: rows.map((r: any) => Number(r[numCol]) || 0),
          type: "histogram",
          marker: { color: "#f59e0b" },
        },
      ],
      plotlyLayout: {
        xaxis: { title: numCol },
        yaxis: { title: "Frequency" },
      },
    });
  }

  // 4. Pie chart - first categorical column count
  if (categoricalCols.length > 0) {
    const catCol = categoricalCols[0].name;

    const counts: Record<string, number> = {};
    rows.forEach((row: any) => {
      const cat = String(row[catCol] || "Unknown");
      counts[cat] = (counts[cat] || 0) + 1;
    });

    visualizations.push({
      id: "viz-4",
      title: `Distribution of ${catCol}`,
      description: `Pie chart showing the distribution of ${catCol}`,
      plotlyData: [
        {
          labels: Object.keys(counts),
          values: Object.values(counts),
          type: "pie",
        },
      ],
      plotlyLayout: {},
    });
  }

  return visualizations;
}
