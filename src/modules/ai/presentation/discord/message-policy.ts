import type { Message } from 'discord.js';

export function shouldRespondToAi(
  message: Message,
  botId: string,
  referencedMessage: Message | null,
): boolean {
  return message.mentions.users.has(botId) || referencedMessage?.author.id === botId;
}
