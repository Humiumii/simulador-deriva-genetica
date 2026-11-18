import { initialCopies, randomStreams, trajectory, type Parameters } from './motor.ts';

export const replicaCount = 100;
const binCount = 10;

export function summarize(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  const bins = Array<number>(binCount).fill(0);
  let lost = 0;
  let fixed = 0;
  for (const value of values) {
    if (value === 0) lost++;
    else if (value === 1) fixed++;
    else bins[Math.floor(value * binCount)]++;
  }
  return { mean, deviation, lost, fixed, bins: [lost, ...bins, fixed] };
}

export function replicate(parameters: Parameters) {
  const streams = randomStreams(parameters.seed, 2 + replicaCount * 2);
  return parameters.sizes.map((size, population) =>
    Array.from({ length: replicaCount }, (_, replicateIndex) =>
      trajectory(size, parameters.initial, parameters.generations, streams[2 + replicateIndex * 2 + population]).at(-1)!,
    ),
  );
}

export function toCsv(parameters: Parameters, values: number[][]) {
  const rows = ['replica,poblacion,N,generaciones,semilla,frecuencia_inicial_solicitada,copias_iniciales,frecuencia_inicial_efectiva,copias_finales,frecuencia_final,estado'];
  values.forEach((frequencies, population) => {
    const size = parameters.sizes[population];
    const copies = initialCopies(size, parameters.initial);
    frequencies.forEach((value, index) => {
      rows.push([
        index + 1, population === 0 ? 'A' : 'B', size, parameters.generations, parameters.seed,
        parameters.initial, copies, copies / (2 * size), Math.round(value * 2 * size), value,
        value === 0 ? 'perdida' : value === 1 ? 'fijacion' : 'polimorfica',
      ].join(','));
    });
  });
  return rows.join('\r\n') + '\r\n';
}
