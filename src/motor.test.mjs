import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, example, randomStreams, trajectory } from './motor.ts';

test('las frecuencias están en el intervalo y son múltiplos de 1/(2N)', () => {
  for (const size of [1, 20, 200, 1000]) {
    const [random] = randomStreams(42, 1);
    const values = trajectory(size, 0.47, 300, random);
    assert.equal(values.length, 301);
    assert.equal(values[0], Math.round(2 * size * 0.47) / (2 * size));
    for (const value of values) {
      assert.ok(value >= 0 && value <= 1);
      assert.ok(Math.abs(value * 2 * size - Math.round(value * 2 * size)) < 1e-10);
    }
  }
});

test('pérdida y fijación se mantienen tras alcanzarse', () => {
  for (const [random, endpoint] of [[() => 0.9, 0], [() => 0.1, 1]]) {
    assert.deepEqual(trajectory(2, 0.5, 3, random), [0.5, endpoint, endpoint, endpoint]);
    assert.deepEqual(trajectory(2, endpoint, 2, () => assert.fail()), [endpoint, endpoint, endpoint]);
  }
});

test('los flujos son reproducibles y consumir uno no cambia los demás', () => {
  const first = randomStreams(42, 202);
  const second = randomStreams(42, 202);
  const signature = (random) => Array.from({ length: 12 }, random);
  const expected = first.map(signature);
  assert.equal(new Set(expected.map(JSON.stringify)).size, 202);
  for (let i = 0; i < 1000; i++) second[0]();
  assert.deepEqual(second.slice(1).map(signature), expected.slice(1));
  assert.deepEqual(compare(example), compare(example));
  assert.notDeepEqual(compare(example), compare({ ...example, seed: 43 }));
});
