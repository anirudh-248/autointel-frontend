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
  const { query, indexId, topK, selectedVisualizations, config } = body;
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

    const systemPrompt = `You are a professional report writer. You have access to a retrieval tool that fetches information from documents.

TASK: Generate a comprehensive HTML report based on the retrieved data.

REPORT STRUCTURE:
1. **Executive Summary** - Key findings and overview (2-3 paragraphs)
2. **Document Overview** - What the document contains, scope, purpose
3. **Key Findings** - Main insights discovered (bullet points or paragraphs)
4. **Detailed Analysis** - In-depth examination of the content
5. **Statistical Insights** - Any patterns, trends, or notable data points
6. **Visualizations** - Charts that illustrate key data (use Chart.js)
7. **Recommendations** - Actionable suggestions based on findings
8. **Conclusion** - Summary and final thoughts

You must include the following visualizations in the report:
${selectedVisualizations || "No visualizations selected."}

CRITICAL CHART.JS REQUIREMENTS:
- Load Chart.js from CDN: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
- Wrap ALL chart initialization in DOMContentLoaded event
- Each chart needs a unique canvas ID
- Place scripts at the END of <body>, just before </body>

EXACT PATTERN FOR CHARTS:

<div class="chart-container" style="position: relative; height: 400px; margin: 30px 0;">
  <canvas id="chart1"></canvas>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  if (typeof Chart !== 'undefined') {
    const ctx1 = document.getElementById('chart1').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Label1', 'Label2', 'Label3'],
        datasets: [{
          label: 'Dataset',
          data: [12, 19, 15],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          title: { display: true, text: 'Chart Title' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
});
</script>

STYLING:
- Use clean, professional CSS
- Include a header with "AutoIntel Report" and generation timestamp
- Use proper typography (headers, paragraphs, spacing)
- Add subtle colors and borders
- Make it print-friendly

OUTPUT: Return ONLY the complete HTML (no markdown code blocks, just pure HTML starting with <!DOCTYPE html>).`;

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
