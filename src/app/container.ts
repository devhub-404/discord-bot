import { Collection } from 'discord.js';
import type { Command } from '../shared/types';
import type { HttpCommand } from '../shared/types/http-interaction';
import type { EventRegistration } from '../shared/handlers/createEvent';
import { createInteractionRegistry, type InteractionRegistry } from '../shared/handlers/createInteraction';

export interface RegistrationContext {
  commands: Collection<string, Command>;
  httpCommands: Collection<string, HttpCommand>;
  events: Map<string, EventRegistration[]>;
  interactions: InteractionRegistry;
}

export function createContainer(): RegistrationContext {
  return {
    commands: new Collection<string, Command>(),
    httpCommands: new Collection<string, HttpCommand>(),
    events: new Map<string, EventRegistration[]>(),
    interactions: createInteractionRegistry(),
  };
}
