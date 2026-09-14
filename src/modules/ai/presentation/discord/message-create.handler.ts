import { Events, type Client, type Message } from 'discord.js';
import buildPrompt from './build-message-context';
import { resolveMessageContext } from './resolve-message-context';
import type { AiClient } from '../../application/ports/ai-client.port';
import { shouldRespondToAi } from './message-policy';
import { DiscordReplyService } from './reply-service';

export function createMessageCreateHandler(
  ai: AiClient,
  replyService = new DiscordReplyService(),
) {
  return async (message: Message, client: Client): Promise<void> => {
    if (message.author.bot || !client.user) return;

    const mayBeReplyToBot = Boolean(message.reference?.messageId);
    if (!message.mentions.users.has(client.user.id) && !mayBeReplyToBot) return;

    const context = await resolveMessageContext(message);
    if (!shouldRespondToAi(message, client.user.id, context.referencedMessage)) return;

    await replyService.respond(message, async () => {
      const prompt = await buildPrompt(message, client, context);
      const result = await ai.generate(prompt);
      return result.text;
    });
  };
}

export const messageCreateEvent = Events.MessageCreate;
