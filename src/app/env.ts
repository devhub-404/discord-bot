export interface BotConfig {
  discord: {
    token: string;
    clientId: string;
    guildId: string;
    publicKey: string;
    httpPort: number;
  };
  ai: {
    model: string;
    reasoningEffort: 'none' | 'low' | 'medium' | 'high';
    maxCompletionTokens: number;
    timeoutMs: number;
  };
}

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Required environment variable is missing: ${name}`);
  }

  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function loadConfig(): BotConfig {
  return {
    discord: {
      token: required('DISCORD_TOKEN'),
      clientId: required('CLIENT_ID'),
      guildId: required('GUILD_ID'),
      publicKey: required('DISCORD_PUBLIC_KEY'),
      httpPort: positiveInteger('DISCORD_HTTP_PORT', 3000),
    },
    ai: {
      model: required('CLOUDFLARE_AI_MODEL'),
      reasoningEffort: (process.env.AI_REASONING_EFFORT?.trim().toLowerCase() as BotConfig['ai']['reasoningEffort'] | undefined) ?? 'low',
      maxCompletionTokens: positiveInteger('AI_MAX_COMPLETION_TOKENS', 512),
      timeoutMs: positiveInteger('AI_TIMEOUT_MS', 30_000),
    },
  };
}
