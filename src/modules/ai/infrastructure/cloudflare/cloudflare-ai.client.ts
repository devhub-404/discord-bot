import type { AiBinding, AiClient, AiGenerationOptions, AiRequest, AiResponse } from '../../application/ports/ai-client.port';

interface Choice {
  message?: { content?: string };
  delta?: { content?: string };
}

interface CloudflareResponse {
  success?: boolean;
  response?: string;
  result?: { response?: string; choices?: Choice[] };
  choices?: Choice[];
  errors?: Array<{ message?: string }>;
}

function responseText(payload: CloudflareResponse): string | undefined {
  return [
    payload.result?.response,
    payload.result?.choices?.[0]?.message?.content,
    payload.response,
    payload.choices?.[0]?.message?.content,
  ].find((value) => value?.trim())?.trim();
}

export class CloudflareAiClient implements AiClient {
  constructor(
    private readonly binding: AiBinding,
    private readonly model: string,
    private readonly timeoutMs: number,
    private readonly options: AiGenerationOptions = {
      model,
      reasoningEffort: 'low',
      maxCompletionTokens: 512,
    },
  ) {}

  private input(request: AiRequest): Record<string, unknown> {
    const input: Record<string, unknown> = {
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: JSON.stringify(request.data) },
      ],
      max_completion_tokens: this.options.maxCompletionTokens,
    };

    if (this.options.reasoningEffort === 'none') {
      input.chat_template_kwargs = { enable_thinking: false };
    } else {
      input.reasoning_effort = this.options.reasoningEffort;
    }

    return input;
  }

  private run(request: AiRequest, signal?: AbortSignal): Promise<CloudflareResponse> {
    let timer: ReturnType<typeof setTimeout>;
    let onAbort: (() => void) | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new DOMException('The AI request timed out', 'TimeoutError')), this.timeoutMs);
    });
    const aborted = signal
      ? new Promise<never>((_, reject) => {
          onAbort = () => reject(new DOMException('The AI request was aborted', 'AbortError'));
          if (signal.aborted) onAbort();
          else signal.addEventListener('abort', onAbort, { once: true });
        })
      : undefined;

    const promises: Promise<unknown>[] = [this.binding.run(this.model, this.input(request)), timeout];
    if (aborted) promises.push(aborted);
    return Promise.race(promises).finally(() => {
      clearTimeout(timer);
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
    }) as Promise<CloudflareResponse>;
  }

  async generate(request: AiRequest, signal?: AbortSignal): Promise<AiResponse> {
    const payload = await this.run(request, signal);
    if (payload.success === false) {
      throw new Error(`Cloudflare AI respondeu com erro: ${payload.errors?.[0]?.message ?? 'unknown error'}`);
    }
    const text = responseText(payload);
    if (!text) throw new Error('Cloudflare AI retornou uma resposta vazia');
    return { text };
  }

}
