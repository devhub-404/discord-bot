import type { BotConfig } from "../../app/env";
import type { RegistrationContext } from "../../app/container";
import type { AiBinding } from './application/ports/ai-client.port';
import type { AiClient } from './application/ports/ai-client.port';
import { CloudflareAiClient } from "./infrastructure/cloudflare/cloudflare-ai.client";
import { registerAskCommand } from './presentation/discord/ask.command';

export function registerAi(config: BotConfig, container: RegistrationContext, binding?: AiBinding): void {
  const client: AiClient = binding
    ? new CloudflareAiClient(
        binding,
        config.ai.model,
        config.ai.timeoutMs,
        {
          model: config.ai.model,
          reasoningEffort: config.ai.reasoningEffort,
          maxCompletionTokens: config.ai.maxCompletionTokens,
        },
      )
    : {
        generate: async () => {
          throw new Error('The Cloudflare Workers AI binding is unavailable. Run the bot as a Worker with an AI binding.');
        },
      };

  registerAskCommand(container.httpCommands, client);
}
