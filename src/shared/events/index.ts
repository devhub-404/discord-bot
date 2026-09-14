import type { RegistrationContext } from '../../app/container';
import { registerInteractionCreate } from './interactionCreate';

export function registerCoreEvents(container: RegistrationContext): void {
  registerInteractionCreate(container);
}
