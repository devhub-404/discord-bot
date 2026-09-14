import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  Client,
  Interaction,
  ModalSubmitInteraction,
} from 'discord.js';
import type { BotClient } from '../types';

export type ComponentInteraction =
  | ButtonInteraction
  | ModalSubmitInteraction
  | AnySelectMenuInteraction;

export type InteractionKind = 'button' | 'modal' | 'select';

export type ComponentHandler = (
  interaction: ComponentInteraction,
  client: Client,
) => void | Promise<unknown>;

export interface InteractionRegistry {
  buttons: Map<string, ComponentHandler>;
  modals: Map<string, ComponentHandler>;
  selects: Map<string, ComponentHandler>;
}

export function createInteractionRegistry(): InteractionRegistry {
  return {
    buttons: new Map(),
    modals: new Map(),
    selects: new Map(),
  };
}

function registryForKind(registry: InteractionRegistry, kind: InteractionKind): Map<string, ComponentHandler> {
  return registry[`${kind}s` as 'buttons' | 'modals' | 'selects'];
}

export function createInteraction(
  kind: InteractionKind,
  customId: string,
  execute: ComponentHandler,
  registry: InteractionRegistry,
): void {
  const handlers = registryForKind(registry, kind);

  if (handlers.has(customId)) {
    throw new Error(`Duplicate ${kind} interaction registration: ${customId}`);
  }

  handlers.set(customId, execute);
}

function findHandler(handlers: Map<string, ComponentHandler>, customId: string): ComponentHandler | undefined {
  const exact = handlers.get(customId);
  if (exact) return exact;

  for (const [pattern, handler] of handlers) {
    if (pattern.endsWith(':*') && customId.startsWith(pattern.slice(0, -1))) {
      return handler;
    }
  }

  return undefined;
}

export async function dispatchInteraction(
  interaction: Interaction,
  client: BotClient,
  registry: InteractionRegistry,
): Promise<boolean> {
  let kind: InteractionKind;
  let customId: string;

  if (interaction.isButton()) {
    kind = 'button';
    customId = interaction.customId;
  } else if (interaction.isModalSubmit()) {
    kind = 'modal';
    customId = interaction.customId;
  } else if (interaction.isAnySelectMenu()) {
    kind = 'select';
    customId = interaction.customId;
  } else {
    return false;
  }

  const handler = findHandler(registryForKind(registry, kind), customId);
  if (!handler) return false;

  await handler(interaction, client);
  return true;
}
