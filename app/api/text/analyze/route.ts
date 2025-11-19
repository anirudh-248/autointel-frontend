import { NextRequest, NextResponse } from "next/server";
import { VectorStoreIndex, storageContextFromDefaults } from "llamaindex";
import { PineconeVectorStore } from "llamaindex/vector-store/PineconeVectorStore";
import { resolveOpenRouterConfig } from "@/lib/openrouter";
import { applyLlamaSettings } from "@/lib/llama/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, indexId, topK, config } = body;

    const llmConfig = resolveOpenRouterConfig(config);

    applyLlamaSettings(llmConfig);

    // Validate input
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

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

    const systemPrompt = `You are a data analysis assistant. You have access to a dataset with the following schema:

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

    // Execute query without any chat history
    const response = await queryEngine.query({
      query: systemPrompt + `\n\n` + query,
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
        query: query,
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
