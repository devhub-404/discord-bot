import type { Message } from 'discord.js';

const MAX_DISCORD_MESSAGE_LENGTH = 2_000;

export function splitMessage(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  for (let index = 0; index < normalized.length; index += MAX_DISCORD_MESSAGE_LENGTH) {
    chunks.push(normalized.slice(index, index + MAX_DISCORD_MESSAGE_LENGTH));
  }
  return chunks;
}

export class DiscordReplyService {
  async respond(message: Message, generate: () => Promise<string>): Promise<void> {
    let reply: Message | undefined;

    try {
      reply = await message.reply('Thinking...');
      const chunks = splitMessage(await generate());

      if (chunks.length === 0) {
        await reply.edit('I could not generate a non-empty answer right now.');
        return;
      }

      await reply.edit(chunks[0]!);
      for (const chunk of chunks.slice(1)) {
        await message.reply(chunk);
      }
    } catch (error) {
      console.error('Error while responding with 404 AI:', error);
      if (reply) {
        await reply.edit('Sorry, I could not answer right now. Please try again later.');
      }
    }
  }
}
