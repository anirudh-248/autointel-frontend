import { Settings } from "llamaindex";
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import type { LLMClientConfig } from "@/lib/openrouter";

interface ApplyOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export function applyLlamaSettings(
  llmConfig: LLMClientConfig,
  options?: ApplyOptions
) {
  console.log("Applying Llama settings:", {
    hasApiKey: !!llmConfig.apiKey,
    apiKeyPrefix: llmConfig.apiKey?.substring(0, 15) + "...",
    baseURL: llmConfig.baseURL,
    model: llmConfig.model,
    embeddingModel: llmConfig.embeddingModel,
    embeddingDimensions: llmConfig.embeddingDimensions,
  });

  (Settings as any).llm = new OpenAI({
    apiKey: llmConfig.apiKey,
    baseURL: llmConfig.baseURL,
    model: llmConfig.model,
    temperature: llmConfig.temperature,
  });

  (Settings as any).embedModel = new OpenAIEmbedding({
    apiKey: llmConfig.apiKey,
    baseURL: llmConfig.baseURL,
    model: llmConfig.embeddingModel,
    dimensions: llmConfig.embeddingDimensions,
    additionalSessionOptions: {
      defaultHeaders: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_BASE_URL || "https://autointel.cloud",
        "X-Title": "AutoIntel Data Analysis Platform",
      },
    },
  });

  if (typeof options?.chunkSize === "number") {
    Settings.chunkSize = options.chunkSize;
  }

  if (typeof options?.chunkOverlap === "number") {
    Settings.chunkOverlap = options.chunkOverlap;
  }
}
