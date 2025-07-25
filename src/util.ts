export function time<T>(fn: () => T): T {
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  console.log(`Time taken: ${end - start}ms`);
  return result;
}
