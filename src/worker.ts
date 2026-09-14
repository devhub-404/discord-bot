import { createContainer } from './app/container';
import { modules, registerModules } from './app/register-modules';
import type { BotConfig } from './app/env';
import { createWorkerInteractionHandler } from './shared/handlers/worker-interactions';
import type { AiBinding } from './modules/ai/application/ports/ai-client.port';

interface WorkerEnv {
  CLIENT_ID: string;
  GUILD_ID: string;
  DISCORD_PUBLIC_KEY: string;
  AI: AiBinding;
  CLOUDFLARE_AI_MODEL: string;
  AI_REASONING_EFFORT?: string;
  AI_MAX_COMPLETION_TOKENS?: string;
  AI_TIMEOUT_MS?: string;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`Missing Worker variable: ${name}`);
  return value.trim();
}

function positiveInteger(value: string | undefined, name: string, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function configFromEnv(env: WorkerEnv): BotConfig {
  const reasoningEffort = env.AI_REASONING_EFFORT?.trim().toLowerCase() ?? 'none';
  if (!['none', 'low', 'medium', 'high'].includes(reasoningEffort)) {
    throw new Error('AI_REASONING_EFFORT must be none, low, medium or high');
  }

  return {
    discord: {
      // The Worker responds through Interaction webhooks. The bot token is only
      // needed by the separate command-registration script.
      token: '',
      clientId: required(env.CLIENT_ID, 'CLIENT_ID'),
      guildId: required(env.GUILD_ID, 'GUILD_ID'),
      publicKey: required(env.DISCORD_PUBLIC_KEY, 'DISCORD_PUBLIC_KEY'),
      httpPort: 0,
    },
    ai: {
      model: required(env.CLOUDFLARE_AI_MODEL, 'CLOUDFLARE_AI_MODEL'),
      reasoningEffort: reasoningEffort as BotConfig['ai']['reasoningEffort'],
      maxCompletionTokens: positiveInteger(env.AI_MAX_COMPLETION_TOKENS, 'AI_MAX_COMPLETION_TOKENS', 512),
      timeoutMs: positiveInteger(env.AI_TIMEOUT_MS, 'AI_TIMEOUT_MS', 30_000),
    },
  };
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    executionContext: WorkerExecutionContext,
  ): Promise<Response> {
    const config = configFromEnv(env);
    const container = createContainer();
    registerModules(config, container, modules, { ai: env.AI });
    return createWorkerInteractionHandler(request, config, container, executionContext);
  },
};
