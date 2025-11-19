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
  (Settings as any).llm = new OpenAI({
    apiKey: llmConfig.apiKey,
    baseURL: llmConfig.baseURL,
    model: llmConfig.model,
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.maxTokens,
  });

  (Settings as any).embedModel = new OpenAIEmbedding({
    apiKey: llmConfig.apiKey,
    baseURL: llmConfig.baseURL,
    model: llmConfig.embeddingModel,
    dimensions: llmConfig.embeddingDimensions,
  });

  if (typeof options?.chunkSize === "number") {
    Settings.chunkSize = options.chunkSize;
  }

  if (typeof options?.chunkOverlap === "number") {
    Settings.chunkOverlap = options.chunkOverlap;
  }
}

