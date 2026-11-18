export const limits = { size: 1000, generations: 300, seed: 0xffffffff };

export interface Parameters {
  sizes: readonly [number, number];
  initial: number;
  generations: number;
  seed: number;
}

export const example: Parameters = { sizes: [20, 200], initial: 0.5, generations: 120, seed: 42 };

export function initialCopies(size: number, frequency: number) {
  return Math.round(2 * size * frequency);
}

const rotate = (value: number, bits: number) => (value << bits) | (value >>> (32 - bits));

/** xoshiro128** with the reference 2^64-step jump between streams. */
export function randomStreams(seed: number, count: number) {
  let word = seed;
  const state = Array.from({ length: 4 }, () => {
    word = (word + 0x9e3779b9) >>> 0;
    let mixed = Math.imul(word ^ (word >>> 16), 0x21f0aaad);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
    return mixed ^ (mixed >>> 15);
  });

  function next(s: number[]) {
    const result = Math.imul(rotate(Math.imul(s[1], 5), 7), 9) >>> 0;
    const shifted = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= shifted;
    s[3] = rotate(s[3], 11);
    return result / 0x100000000;
  }

  return Array.from({ length: count }, (_, index) => {
    const stream = state.slice();
    if (index < count - 1) {
      const jumped = [0, 0, 0, 0];
      for (const mask of [0x8764000b, 0xf542d2d3, 0x6fa035c3, 0x77f2db5b]) {
        for (let bit = 0; bit < 32; bit++) {
          if (mask & (1 << bit)) {
            for (let i = 0; i < 4; i++) jumped[i] ^= state[i];
          }
          next(state);
        }
      }
      state.splice(0, 4, ...jumped);
    }
    return () => next(stream);
  });
}

export function trajectory(size: number, initial: number, generations: number, random: () => number) {
  const copies = 2 * size;
  let current = initialCopies(size, initial);
  const frequencies = [current / copies];
  for (let generation = 1; generation <= generations; generation++) {
    if (current > 0 && current < copies) {
      const probability = current / copies;
      current = 0;
      for (let draw = 0; draw < copies; draw++) {
        if (random() < probability) current++;
      }
    }
    frequencies.push(current / copies);
  }
  return frequencies;
}

export function compare(parameters: Parameters) {
  const streams = randomStreams(parameters.seed, 2);
  return parameters.sizes.map((size, index) =>
    trajectory(size, parameters.initial, parameters.generations, streams[index]),
  );
}
