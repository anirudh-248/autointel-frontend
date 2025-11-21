type PartialClientConfig = {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  temperature?: number;
};

export type LLMClientConfig = Required<
  Omit<PartialClientConfig, "temperature" | "embeddingDimensions">
> & {
  temperature: number;
  embeddingDimensions?: number;
};

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "x-ai/grok-4-fast";
const OPENROUTER_EMBED_MODEL =
  process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-large";

const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_EMBED_MODEL =
  process.env.OPENAI_EMBED_MODEL || "text-embedding-3-large";

function parseDimension(value?: string | number | null): number | undefined {
  if (value == null) return undefined;
  const numeric =
    typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

const DEFAULT_EMBED_DIM =
  parseDimension(process.env.OPENAI_EMBED_DIMENSIONS) ??
  parseDimension(process.env.OPENROUTER_EMBED_DIMENSIONS) ??
  parseDimension(process.env.PINECONE_VECTOR_DIMENSION) ??
  1024;

const ENV_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY?.trim();
const ENV_OPENAI_KEY = process.env.OPENAI_API_KEY?.trim();

function looksLikeOpenRouterKey(key?: string) {
  if (!key) return false;
  return key.startsWith("sk-or-") || key.startsWith("or-");
}

function preferOpenRouter(
  config: PartialClientConfig | undefined,
  apiKey: string
) {
  if (config?.baseURL) {
    if (config.baseURL.includes("openrouter.ai")) return true;
    if (config.baseURL.includes("api.openai.com")) return false;
  }

  if (config?.apiKey && looksLikeOpenRouterKey(config.apiKey.trim())) {
    return true;
  }

  if (ENV_OPENROUTER_KEY && apiKey === ENV_OPENROUTER_KEY) {
    return true;
  }

  if (ENV_OPENAI_KEY && apiKey === ENV_OPENAI_KEY) {
    return false;
  }

  return looksLikeOpenRouterKey(apiKey);
}

export function resolveOpenRouterConfig(
  config?: PartialClientConfig
): LLMClientConfig {
  const apiKey = config?.apiKey?.trim() || ENV_OPENROUTER_KEY || ENV_OPENAI_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OpenRouter/OpenAI API key. Provide config.apiKey or set OPENROUTER_API_KEY/OPENAI_API_KEY."
    );
  }

  const useOpenRouter = preferOpenRouter(config, apiKey);

  const embeddingModel =
    config?.embeddingModel ||
    (useOpenRouter ? OPENROUTER_EMBED_MODEL : OPENAI_EMBED_MODEL);

  const embeddingDimensions =
    config?.embeddingDimensions ?? DEFAULT_EMBED_DIM ?? undefined;

  return {
    apiKey,
    baseURL:
      config?.baseURL ||
      (useOpenRouter ? OPENROUTER_BASE_URL : OPENAI_BASE_URL),
    model: config?.model || (useOpenRouter ? OPENROUTER_MODEL : OPENAI_MODEL),
    embeddingModel,
    embeddingDimensions,
    temperature: config?.temperature ?? 0.1,
  };
}
