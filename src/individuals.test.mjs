import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, example } from './motor.ts';
import { pairIndividuals } from './individuals.ts';

test('cada generación representa exactamente las 2N copias del motor', () => {
  const paths = compare(example);
  paths.forEach((path, population) => path.forEach((frequency, generation) => {
    const size = example.sizes[population];
    const count = Math.round(frequency * 2 * size);
    const individuals = pairIndividuals(size, count, example.seed, population, generation);
    assert.equal(individuals.length, size);
    assert.ok(individuals.every(pair => pair.length === 2));
    assert.equal(individuals.flat().filter(allele => allele === 'A').length, count);
    assert.equal(individuals.flat().filter(allele => allele === 'B').length, 2 * size - count);
  }));
  assert.equal(paths[0][11], 1);
});

test('el emparejamiento depende de los parámetros, no del recorrido visual', () => {
  const before = compare(example);
  const pair = () => pairIndividuals(200, 183, 42, 1, 11);
  const original = pair();
  assert.notDeepEqual(pairIndividuals(200, 183, 43, 1, 11), original);
  pairIndividuals(200, 189, 42, 1, 12);
  assert.deepEqual(pair(), original);
  assert.deepEqual(compare(example), before);
});

test('la pérdida y la fijación producen antenas de un solo tipo', () => {
  assert.ok(pairIndividuals(20, 0, 42, 0, 0).every(pair => pair.join('') === 'BB'));
  assert.ok(pairIndividuals(20, 40, 42, 0, 11).every(pair => pair.join('') === 'AA'));
});
