import { NextRequest, NextResponse } from "next/server";
import {
  VectorStoreIndex,
  Settings,
  storageContextFromDefaults,
} from "llamaindex";
import { PineconeVectorStore } from "llamaindex/vector-store/PineconeVectorStore";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { indexId, topK, config } = body;
  // Initialize Pinecone client
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  // Configure LlamaIndex settings
  Settings.llm = new OpenAI({
    apiKey: config.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    model: "openrouter/sherlock-dash-alpha", // Popular OpenRouter model
    temperature: 0.1,
    maxTokens: 512,
  });

  Settings.embedModel = new OpenAIEmbedding({
    apiKey: config.apiKey, // Can use same OpenRouter key
    baseURL: "https://openrouter.ai/api/v1",
    model: "openai/text-embedding-3-large",
  });
  try {

    // Validate input
    // if (!query || typeof query !== "string") {
    //   return NextResponse.json(
    //     { error: "Query is required and must be a string" },
    //     { status: 400 }
    //   );
    // }

    if (!indexId || typeof indexId !== "string") {
      return NextResponse.json(
        { error: "Index ID is required and must be a string" },
        { status: 400 }
      );
    }

    if (!process.env.PINECONE_API_KEY) {
      return NextResponse.json(
        { error: "Pinecone API key not configured" },
        { status: 500 }
      );
    }

    if (!process.env.PINECONE_INDEX_NAME) {
      return NextResponse.json(
        { error: "Pinecone index name not configured" },
        { status: 500 }
      );
    }

    // Initialize Pinecone vector store with the specific namespace
    const vectorStore = new PineconeVectorStore({
      indexName: process.env.PINECONE_INDEX_NAME,
      namespace: indexId,
    });

    // Create storage context with vector store
    const storageContext = await storageContextFromDefaults({
      vectorStore,
    });

    // Create index from existing vector store
    const index = await VectorStoreIndex.fromVectorStore(vectorStore);

    // Create query engine with retriever configuration
    const queryEngine = index.asQueryEngine({
      similarityTopK: topK || 3, // Number of similar documents to retrieve
    });

    const systemPrompt = `You are a data visualization expert. Analyze this dataset and suggest 4 diverse visualizations using Plotly.
      Create 6-10 diverse visualizations (bar, line, scatter, pie, box, histogram, etc.) that best represent the data patterns.

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

    // Execute query without any chat history
    const response = await queryEngine.query({
      query: systemPrompt + `\n\n`,
    });

    // Extract source nodes for transparency
    // const sourceNodes =
    //   response.sourceNodes?.map((node) => ({
    //     text: node.node.getContent(), // ✅ Uses the proper method        score: node.score,
    //     metadata: node.node.metadata,
    //   })) || [];

    return NextResponse.json({
      success: true,
      answer: response.response,
      // sources: sourceNodes,
      metadata: {
        indexId: indexId,
        // query: query,
        timestamp: new Date().toISOString(),
        // retrievedNodes: sourceNodes.length,
      },
    });
  } catch (error: any) {
    console.error("Error querying document:", error);
    return NextResponse.json(
      {
        error: "Failed to query document",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
