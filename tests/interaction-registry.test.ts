import assert from 'node:assert/strict';
import test from 'node:test';
import { createInteraction, createInteractionRegistry, dispatchInteraction } from '../src/shared/handlers/createInteraction';

test('dispatches an interaction using an exact or wildcard custom id', async () => {
  const registry = createInteractionRegistry();
  let receivedId = '';

  createInteraction('button', 'ticket:*', (interaction) => {
    receivedId = interaction.customId;
  }, registry);

  const interaction = {
    customId: 'ticket:close',
    isButton: () => true,
    isModalSubmit: () => false,
    isAnySelectMenu: () => false,
  } as never;

  const dispatched = await dispatchInteraction(interaction, {} as never, registry);

  assert.equal(dispatched, true);
  assert.equal(receivedId, 'ticket:close');
});

test('rejects duplicate component interaction ids', () => {
  const registry = createInteractionRegistry();
  const handler = () => undefined;

  createInteraction('modal', 'feedback', handler, registry);

  assert.throws(
    () => createInteraction('modal', 'feedback', handler, registry),
    /Duplicate modal interaction registration: feedback/,
  );
});
