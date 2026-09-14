import assert from 'node:assert/strict';
import test from 'node:test';
import type { BotConfig } from '../src/app/env';
import { createContainer } from '../src/app/container';
import { registerModules } from '../src/app/register-modules';

const config = {} as BotConfig;

test('registers modules in declaration order using the shared container', () => {
  const container = createContainer();
  const calls: string[] = [];

  registerModules(config, container, [
    {
      id: 'first',
      register: (currentContainer) => {
        calls.push('first');
        currentContainer.events.set('first', []);
      },
    },
    {
      id: 'second',
      register: (currentContainer) => {
        calls.push('second');
        currentContainer.events.set('second', []);
      },
    },
  ]);

  assert.deepEqual(calls, ['first', 'second']);
  assert.deepEqual([...container.events.keys()], ['first', 'second']);
});

test('rejects duplicate module names', () => {
  assert.throws(
    () => registerModules(config, createContainer(), [
      { id: 'duplicate', register: () => undefined },
      { id: 'duplicate', register: () => undefined },
    ]),
    /Duplicate module registration: duplicate/,
  );
});

test('orders modules by dependencies', () => {
  const calls: string[] = [];
  const registered = registerModules(config, createContainer(), [
    {
      id: 'child',
      dependsOn: ['parent'],
      register: () => calls.push('child'),
    },
    {
      id: 'parent',
      register: () => calls.push('parent'),
    },
  ]);

  assert.deepEqual(calls, ['parent', 'child']);
  assert.deepEqual(registered.map((module) => module.id), ['parent', 'child']);
});
