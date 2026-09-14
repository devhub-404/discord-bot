import assert from 'node:assert/strict';
import test from 'node:test';
import { createContainer } from '../src/app/container';
import { BotApplication } from '../src/app/application';
import type { BotConfig } from '../src/app/env';
import type { BotModule } from '../src/app/module';

const config = {
  discord: {
    token: 'test-token',
    clientId: 'test-client',
    guildId: 'test-guild',
    publicKey: '0'.repeat(64),
    httpPort: 0,
  },
  ai: {
    model: 'test-model',
    reasoningEffort: 'none',
    maxCompletionTokens: 1,
    timeoutMs: 1,
  },
} satisfies BotConfig;

test('starts and stops modules in the expected lifecycle order', async () => {
  const container = createContainer();
  const calls: string[] = [];
  const moduleCatalog: BotModule[] = [
    {
      id: 'first',
      register: () => undefined,
      start: async () => { calls.push('start:first'); },
      stop: async () => { calls.push('stop:first'); },
    },
    {
      id: 'second',
      register: () => undefined,
      start: async () => { calls.push('start:second'); },
      stop: async () => { calls.push('stop:second'); },
    },
  ];

  const application = new BotApplication(config, container, moduleCatalog, async () => { calls.push('sync'); });

  await application.start();
  await application.stop();

  assert.deepEqual(calls, [
    'sync',
    'start:first',
    'start:second',
    'stop:second',
    'stop:first',
  ]);
});
