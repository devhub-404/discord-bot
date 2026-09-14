import type { BotConfig } from "./env";
import type { RegistrationContext } from "./container";
import type { BotModule, ModuleDependencies } from "./module";
import { registerAi } from "../modules/ai";
// import { registerAdminModule } from "../modules/admin";
// import { registerVoiceModule } from "../modules/voice";

export const modules: readonly BotModule[] = [
  // {
  //   id: 'admin',
  //   register: (container) => registerAdminModule(container),
  // },
  // {
  //   id: 'voice',
  //   register: (container) => registerVoiceModule(container),
  // },
  {
    id: 'ai',
    register: (container, config, dependencies) => registerAi(config, container, dependencies?.ai),
  },
];

function orderModules(registeredModules: readonly BotModule[]): BotModule[] {
  const byId = new Map<string, BotModule>();
  for (const module of registeredModules) {
    if (byId.has(module.id)) {
      throw new Error(`Duplicate module registration: ${module.id}`);
    }
    byId.set(module.id, module);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: BotModule[] = [];

  function visit(module: BotModule): void {
    if (visited.has(module.id)) return;
    if (visiting.has(module.id)) {
      throw new Error(`Circular module dependency detected at: ${module.id}`);
    }

    visiting.add(module.id);
    for (const dependencyId of module.dependsOn ?? []) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        throw new Error(`Module ${module.id} depends on missing module: ${dependencyId}`);
      }
      visit(dependency);
    }
    visiting.delete(module.id);
    visited.add(module.id);
    ordered.push(module);
  }

  registeredModules.forEach(visit);
  return ordered;
}

export function registerModules(
  config: BotConfig,
  container: RegistrationContext,
  registeredModules: readonly BotModule[] = modules,
  dependencies?: ModuleDependencies,
): readonly BotModule[] {
  const orderedModules = orderModules(registeredModules);

  for (const module of orderedModules) {
    module.register(container, config, dependencies);
    console.log(`Registered module ${module.id}`);
  }

  return orderedModules;
}
