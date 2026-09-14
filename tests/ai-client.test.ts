import assert from 'node:assert/strict';
import test from 'node:test';
import { CloudflareAiClient } from '../src/modules/ai/infrastructure/cloudflare/cloudflare-ai.client';
import type { AiBinding } from '../src/modules/ai/application/ports/ai-client.port';

const options = {
  model: '@cf/qwen/qwen3.8-27b',
  reasoningEffort: 'none' as const,
  maxCompletionTokens: 512,
};

test('calls the Cloudflare Workers AI binding without REST credentials', async () => {
  let call: { model: string; input: Record<string, unknown> } | undefined;
  const binding: AiBinding = {
    run: async <T>(model, input) => {
      call = { model, input };
      return { response: 'response' } as T;
    },
  };

  const client = new CloudflareAiClient(binding, options.model, 1_000, options);
  const result = await client.generate({ system: 'system', data: { message: 'question' } });

  assert.equal(result.text, 'response');
  assert.deepEqual(call, {
    model: options.model,
    input: {
      messages: [
        { role: 'system', content: 'system' },
        { role: 'user', content: JSON.stringify({ message: 'question' }) },
      ],
      chat_template_kwargs: { enable_thinking: false },
      max_completion_tokens: 512,
    },
  });
});

test('converts Cloudflare errors into an error', async () => {
  const binding: AiBinding = {
    run: async <T>() => ({ success: false, errors: [{ message: 'model unavailable' }] }) as T,
  };

  await assert.rejects(
    new CloudflareAiClient(binding, 'model', 1_000, options).generate({ system: 'system', data: {} }),
    /model unavailable/,
  );
});
