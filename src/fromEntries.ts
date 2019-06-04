// Polyfill Object.fromEntries. Gives us type safety.
export default function fromEntries<
  O extends Object,
  K extends keyof O,
  V extends O[K]
>(pairs: [K, V][]): O {
  const o: Partial<O> = {};
  for (let [k, v] of pairs) {
    o[k] = v;
  }
  return o as O;
}
