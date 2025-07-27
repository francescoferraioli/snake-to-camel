import { camelCase } from 'lodash';

export function time<T>(fn: () => T): T {
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  console.log(`Time taken: ${end - start}ms`);
  return result;
}
export function isSnakeCase(name: string): boolean {
  if (!name.includes('_')) return false;
  // Check for snake_case pattern: all lowercase with underscores
  return /^[a-z]+(_[a-z0-9]+)*$/.test(name);
}
export function toCamelCase(name: string): string {
  return camelCase(name);
}
