import { NextRequest, NextResponse } from "next/server";
import { Document, VectorStoreIndex, storageContextFromDefaults } from "llamaindex";
import { PineconeVectorStore } from "llamaindex/vector-store/PineconeVectorStore";
import { resolveOpenRouterConfig } from "@/lib/openrouter";
import { applyLlamaSettings } from "@/lib/llama/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, namespace, config } = body;

    const llmConfig = resolveOpenRouterConfig(config);
    applyLlamaSettings(llmConfig, { chunkSize: 1024, chunkOverlap: 20 });

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text content is required and must be a string" },
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

    // Generate a unique namespace if not provided
    const indexNamespace =
      namespace ||
      `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create document from text
    const document = new Document({
      text: text,
      metadata: {
        source: "user_upload",
        timestamp: new Date().toISOString(),
        namespace: indexNamespace,
      },
    });

    // Initialize Pinecone vector store
    const vectorStore = new PineconeVectorStore({
      indexName: process.env.PINECONE_INDEX_NAME,
      namespace: indexNamespace,
    });

    // Create storage context with vector store
    const storageContext = await storageContextFromDefaults({
      vectorStore,
    });

    // Create index from documents
    const index = await VectorStoreIndex.fromDocuments([document], {
      storageContext,
    });

    console.log(
      `Successfully indexed document in namespace: ${indexNamespace}`
    );

    return NextResponse.json({
      success: true,
      message: "Document indexed successfully",
      indexId: indexNamespace,
      metadata: {
        textLength: text.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error indexing document:", error);
    return NextResponse.json(
      {
        error: "Failed to index document",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
