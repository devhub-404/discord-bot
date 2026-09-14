import { createContainer } from "./container";
import { modules, registerModules } from "./register-modules";
import type { BotConfig } from "./env";
import { BotApplication } from './application';
import type { BotModule } from './module';

export function bootstrap(
  config: BotConfig,
  moduleCatalog: readonly BotModule[] = modules,
): BotApplication {
  const container = createContainer();
  const registeredModules = registerModules(config, container, moduleCatalog);
  return new BotApplication(config, container, registeredModules);
}
