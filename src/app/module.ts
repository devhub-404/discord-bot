import type { BotConfig } from './env';
import type { RegistrationContext } from './container';
import type { AiBinding } from '../modules/ai/application/ports/ai-client.port';

export interface ModuleDependencies {
  ai?: AiBinding;
}

export interface BotModule {
  id: string;
  dependsOn?: readonly string[];
  register(context: RegistrationContext, config: BotConfig, dependencies?: ModuleDependencies): void;
  start?(runtime: RuntimeContext): void | Promise<void>;
  stop?(runtime: RuntimeContext): void | Promise<void>;
}

export interface RuntimeContext {
  config: BotConfig;
  container: RegistrationContext;
}
