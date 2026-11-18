import { randomStreams } from './motor.ts';

export type Allele = 'A' | 'B';
export type Individual = readonly [Allele, Allele];
export const displayLimit = 48;

export function pairIndividuals(size: number, copiesA: number, seed: number, population: number, generation: number): Individual[] {
  // Visual stream only. Its consumption is unrelated to the simulation and to the playback order.
  const visualSeed = (seed ^ 0x5d62e487 ^ Math.imul(population + 1, 0xa511e9b3) ^ Math.imul(generation, 0x9e3779b9)) >>> 0;
  const [random] = randomStreams(visualSeed, 1);
  const alleles = Array.from<unknown, Allele>({ length: 2 * size }, (_, i) => i < copiesA ? 'A' : 'B');
  for (let i = alleles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [alleles[i], alleles[j]] = [alleles[j], alleles[i]];
  }
  return Array.from({ length: size }, (_, i) => [alleles[2 * i], alleles[2 * i + 1]]);
}
