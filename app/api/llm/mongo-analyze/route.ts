import { NextRequest, NextResponse } from "next/server";
import { flattenDocuments } from "@/lib/flatten";
import { VisualizationSpec } from "@/lib/types";
import { getUserInfo } from "@/lib/api";

interface LLMAnalysisResponse {
  answer: string;
  visualizations: VisualizationSpec[];
  followUps: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { documents, query, config, connectionString } = await req.json();

    if (!documents || !Array.isArray(documents) || !config?.apiKey) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const flattened = flattenDocuments(documents);
    const fields = Object.keys(flattened[0] || {});
    const ex = await fetch(`${process.env.BASE_URL}/api/db/overview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionString }),
    });
    const schemaFull = await ex.json();

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

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model || "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
        }),
      }
    );

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    let parsed: any = {};
    try {
      parsed = JSON.parse(content.replace(/```json|```/g, ""));
    } catch (parseErr) {
      console.warn("Could not parse LLM response as JSON:", parseErr);
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
