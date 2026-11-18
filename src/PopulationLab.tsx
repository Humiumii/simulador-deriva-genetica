import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { displayLimit, pairIndividuals, type Allele, type Individual } from './individuals';
import { populationName } from './Trajectory';

const CreatureScene = lazy(() => import('./CreatureScene'));
const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 10 });
const approximate = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });

function divisor(a: number, b: number): number {
  return b ? divisor(b, a % b) : a;
}

function percentage(copies: number, total: number) {
  const common = divisor(100 * copies, total);
  const numerator = 100 * copies / common;
  const denominator = total / common;
  let remainder = denominator;
  for (const factor of [2, 5]) {
    while (remainder % factor === 0) remainder /= factor;
  }
  if (remainder === 1) return <strong>{number.format(numerator / denominator)} %</strong>;
  return <strong title={`≈ ${approximate.format(numerator / denominator)} %`}>{numerator}/{denominator} %</strong>;
}

function AlleleIcon({ allele }: { allele: Allele }) {
  return <span className={`allele-icon allele-${allele}`} aria-hidden="true" />;
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function FlatCreatures({ individuals, selected, onSelect }: {
  individuals: Individual[]; selected: number; onSelect: (index: number) => void;
}) {
  return <div className={`flat-creatures ${individuals.length <= 24 ? 'flat-sparse' : ''}`} role="group" aria-label="Monitos en 2D">
    {individuals.map((pair, index) => <button type="button" className="flat-creature" key={index}
      aria-label={`Monito ${index + 1}: alelos ${pair.join(' y ')}`} aria-pressed={index === selected} onClick={() => onSelect(index)}>
      <span className="flat-antennas" aria-hidden="true">{pair.map((allele, side) =>
        <i className={`flat-stem allele-${allele}`} key={side}><AlleleIcon allele={allele} /></i>)}</span>
      <span className="flat-body" aria-hidden="true"><i /><i /><b /></span>
    </button>)}
  </div>;
}

export function PopulationLab({ size, frequency, generation, seed, population, flat }: {
  size: number; frequency: number; generation: number; seed: number; population: number; flat: boolean;
}) {
  const copies = 2 * size;
  const copiesA = Math.round(frequency * copies);
  const individuals = useMemo(() => pairIndividuals(size, copiesA, seed, population, generation).slice(0, displayLimit),
    [size, copiesA, seed, population, generation]);
  const [selection, setSelection] = useState(0);
  const [failed, setFailed] = useState(false);
  const selected = Math.min(selection, individuals.length - 1);
  const pair = individuals[selected];
  const fallback = <FlatCreatures individuals={individuals} selected={selected} onSelect={setSelection} />;
  const label = populationName(population);

  return <section className={`chamber chamber-${population}`} aria-labelledby={`chamber-${population}`}
    data-generation={generation} data-copies-a={copiesA} data-copies-b={copies - copiesA}>
    <div className="chamber-header">
      <div><h3 id={`chamber-${population}`}>{label}</h3><span>{size} individuos</span></div>
      <span className="generation-label">Generación <strong>{generation}</strong></span>
    </div>
    <div className="chamber-viewport">
      {flat || failed ? fallback : <SceneBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <CreatureScene individuals={individuals} selected={selected} onSelect={setSelection}
            population={population} onFailure={() => setFailed(true)} fallback={fallback} />
        </Suspense>
      </SceneBoundary>}
      {individuals.length < size && <span className="sample-label">{individuals.length} de {size} visibles</span>}
    </div>
    <dl className="allele-counts">
      {(['A', 'B'] as const).map((allele, index) => {
        const count = index === 0 ? copiesA : copies - copiesA;
        return <div key={allele}>
          <dt><AlleleIcon allele={allele} /> Alelo {allele}</dt>
          <dd>{percentage(count, copies)}<span>{count} de {copies} copias</span></dd>
        </div>;
      })}
    </dl>
    <div className="individual-detail">
      <label>Monito<select aria-label={`Seleccionar monito de ${label}`} value={selected}
        onChange={event => setSelection(Number(event.target.value))}>
        {individuals.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
      </select></label>
      <output aria-live="off"><span>Antenas</span>{pair.map((allele, i) =>
        <strong key={i}><AlleleIcon allele={allele} /> {allele}</strong>)}</output>
    </div>
  </section>;
}

export function AlleleLegend() {
  return <p className="lab-legend"><span><AlleleIcon allele="A" /> A · punta redonda</span>
    <span><AlleleIcon allele="B" /> B · punta de rombo</span>
    <span>Cada monito tiene dos copias. Su emparejamiento es ilustrativo.</span></p>;
}
