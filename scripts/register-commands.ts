import 'dotenv/config';
import { createContainer } from '../src/app/container';
import { loadConfig } from '../src/app/env';
import { registerDiscordCommands } from '../src/app/register-discord-commands';
import { modules, registerModules } from '../src/app/register-modules';

async function main(): Promise<void> {
  const config = loadConfig();
  const container = createContainer();
  registerModules(config, container, modules);
  await registerDiscordCommands(container.httpCommands, config);
}

main().catch((error) => {
  console.error('Failed to register Discord commands:', error);
  process.exitCode = 1;
});
