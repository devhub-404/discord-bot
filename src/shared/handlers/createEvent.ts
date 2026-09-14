import { Client } from "discord.js";

export type EventHandler = (...args: never[]) => void | Promise<unknown>;

export interface EventOptions {
  once?: boolean;
  priority?: number;
}

export interface EventRegistration {
  execute: EventHandler;
  once: boolean;
  priority: number;
}

export function createEvent(
  name: string,
  execute: EventHandler,
  registry: Map<string, EventRegistration[]>,
  options: EventOptions = {},
): void {
  const handlers = registry.get(name) ?? [];
  if (handlers.some((handler) => handler.execute === execute)) {
    throw new Error(`Duplicate event handler registration: ${name}`);
  }

  handlers.push({
    execute,
    once: options.once ?? false,
    priority: options.priority ?? 0,
  });
  handlers.sort((left, right) => right.priority - left.priority);
  registry.set(name, handlers);
}

export function loadEvents(
  client: Client,
  registry: Map<string, EventRegistration[]>,
): void {
  registry.forEach((handlers, name) => {
    const executedOnce = new Set<EventRegistration>();

    client.on(name, async (...args) => {
      for (const registration of handlers) {
        if (registration.once && executedOnce.has(registration)) continue;

        const startedAt = performance.now();
        try {
          await registration.execute(...args as never[], client as never);
          if (registration.once) executedOnce.add(registration);
        } catch (error) {
          console.error(`Error in event handler ${name}:`, error);
        } finally {
          const durationMs = Math.round(performance.now() - startedAt);
          if (durationMs >= 1000) {
            console.warn(`Slow event handler ${name}: ${durationMs}ms`);
          }
        }
      }
    });
    console.log(`Loaded event ${name}`);
  });
}
