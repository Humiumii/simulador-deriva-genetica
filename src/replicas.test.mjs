import { test } from 'node:test';
import assert from 'node:assert/strict';
import { example, randomStreams, trajectory } from './motor.ts';
import { replicate, summarize, toCsv } from './replicas.ts';

test('100 réplicas por población usan flujos separados y reproducibles', () => {
  const result = replicate(example);
  assert.deepEqual(result, replicate(example));
  assert.notDeepEqual(result, replicate({ ...example, seed: 43 }));
  assert.deepEqual(result.map(values => values.length), [100, 100]);
  const streams = randomStreams(example.seed, 202);
  result.forEach((values, population) => {
    values.forEach((value, index) => {
      const expected = trajectory(example.sizes[population], example.initial, example.generations,
        streams[2 + 2 * index + population]).at(-1);
      assert.equal(value, expected);
    });
  });
});

test('el resumen y CSV representan las mismas frecuencias, incluidas ambas absorciones', () => {
  const values = [[0, 0.5, 1], [0.25, 0.5, 0.75]];
  const stats = summarize(values[0]);
  assert.equal(stats.lost, 1);
  assert.equal(stats.fixed, 1);
  assert.equal(stats.mean, 0.5);
  assert.equal(stats.deviation, Math.sqrt(0.5 / 3));
  assert.equal(stats.bins.reduce((sum, value) => sum + value, 0), 3);
  const rows = toCsv(example, values).trim().split('\r\n').slice(1).map(row => row.split(','));
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.filter(row => row[1] === 'A').map(row => Number(row[9])), values[0]);
  assert.equal(rows.filter(row => row[10] === 'perdida').length, stats.lost);
  assert.equal(rows.filter(row => row[10] === 'fijacion').length, stats.fixed);
});
