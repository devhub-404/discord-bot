export interface AiRequest {
  system: string;
  data: Record<string, unknown>;
}

/** Runtime binding exposed by Cloudflare Workers as `env.AI`. */
export interface AiBinding {
  run<T = unknown>(model: string, input: Record<string, unknown>): Promise<T>;
}

export interface AiResponse {
  text: string;
}

export interface AiGenerationOptions {
  model: string;
  reasoningEffort: 'none' | 'low' | 'medium' | 'high';
  maxCompletionTokens: number;
}

export interface AiClient {
  generate(request: AiRequest, signal?: AbortSignal): Promise<AiResponse>;
}
