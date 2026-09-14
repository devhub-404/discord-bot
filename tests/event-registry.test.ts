import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvent, loadEvents, type EventRegistration } from '../src/shared/handlers/createEvent';

test('executes event handlers by priority and supports once handlers', async () => {
  const registry = new Map<string, EventRegistration[]>();
  const calls: string[] = [];

  createEvent('ready', () => { calls.push('low'); }, registry, { priority: 1 });
  createEvent('ready', () => { calls.push('once'); }, registry, { priority: 10, once: true });

  let listener: ((...args: never[]) => Promise<void>) | undefined;
  const client = {
    on: (_name: string, handler: (...args: never[]) => Promise<void>) => {
      listener = handler;
      return client;
    },
  } as never;

  loadEvents(client, registry);
  await listener?.();
  await listener?.();

  assert.deepEqual(calls, ['once', 'low', 'low']);
});

test('rejects registering the same event handler twice', () => {
  const registry = new Map<string, EventRegistration[]>();
  const handler = () => undefined;

  createEvent('messageCreate', handler, registry);

  assert.throws(
    () => createEvent('messageCreate', handler, registry),
    /Duplicate event handler registration: messageCreate/,
  );
});
