import { NextRequest, NextResponse } from "next/server";
import { flattenDocuments } from "@/lib/flatten";
import { VisualizationSpec } from "@/lib/types";

interface LLMAnalysisResponse {
  answer: string;
  visualizations: VisualizationSpec[];
  followUps: string[];
}

export async function POST(req: NextRequest) {
  try {
    console.log("mongo-analyze: Request received");
    const { documents, query, config, connectionString } = await req.json();

    if (!documents || !Array.isArray(documents) || !config?.apiKey) {
      console.error("mongo-analyze: Invalid request parameters");
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    console.log(`mongo-analyze: Processing ${documents.length} documents`);

    const flattened = flattenDocuments(documents);
    console.log(`mongo-analyze: Flattened to ${flattened.length} records`);

    const fields = Object.keys(flattened[0] || {});
    console.log(`mongo-analyze: Fields: ${fields.join(", ")}`);

    // Fetch schema overview
    console.log("mongo-analyze: Fetching database overview...");
    const ex = await fetch(`${process.env.BASE_URL}/api/db/overview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionString }),
    });

    if (!ex.ok) {
      console.error(`mongo-analyze: Failed to fetch overview: ${ex.status}`);
      return NextResponse.json(
        { error: "Failed to fetch database overview" },
        { status: 500 }
      );
    }

    const schemaFull = await ex.json();
    console.log("mongo-analyze: Schema fetched successfully");

    const sampleData = flattened.slice(0, 6);

    const systemPrompt = `You are a MongoDB-aware data analysis assistant. 
The dataset has been flattened from nested documents. 
Dataset: ${JSON.stringify(flattened, null, 2)}

Total records: ${flattened.length}

Sample data:
${JSON.stringify(sampleData, null, 2)}

Here is the detailed schema of the Mongo Database:
${JSON.stringify(schemaFull, null, 2)}

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

    console.log("mongo-analyze: Calling OpenRouter API...");
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model || "x-ai/grok-4-fast",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `mongo-analyze: OpenRouter API error: ${response.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("mongo-analyze: LLM response received");
    const content = data.choices[0]?.message?.content || "";

    let parsed: any = {};
    try {
      parsed = JSON.parse(content.replace(/```json|```/g, ""));
      console.log("mongo-analyze: Successfully parsed LLM response");
    } catch (parseErr) {
      console.warn(
        "mongo-analyze: Could not parse LLM response as JSON:",
        parseErr
      );
    }

    const result: LLMAnalysisResponse = {
      answer: parsed.answer || content,
      visualizations: parsed.visualizations || [],
      followUps: parsed.followUps || [],
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("mongo-analyze error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
