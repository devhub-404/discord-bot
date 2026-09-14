import type { Collection } from 'discord.js';
import type { HttpCommand, HttpCommandInteraction } from '../types/http-interaction';

export function createHttpCommand(
  data: HttpCommand['data'],
  execute: (interaction: HttpCommandInteraction) => Promise<unknown>,
  registry: Collection<string, HttpCommand>,
): void {
  const commandName = data.name;
  if (!commandName) throw new Error('HTTP command must have a name');
  if (registry.has(commandName)) {
    throw new Error(`Duplicate HTTP command registration: ${commandName}`);
  }

  registry.set(commandName, { data, execute });
}
