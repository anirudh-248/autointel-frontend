import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  VectorStoreIndex,
  Settings,
  storageContextFromDefaults,
} from "llamaindex";
import { PineconeVectorStore } from "llamaindex/vector-store/PineconeVectorStore";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbedding } from "@llamaindex/openai";
import { OpenAI } from "@llamaindex/openai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, namespace, config } = body;
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

  // Set chunk size and overlap
  Settings.chunkSize = 1024;
  Settings.chunkOverlap = 20;
  try {
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
