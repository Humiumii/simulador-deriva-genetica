import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { compare, example, limits, initialCopies, type Parameters } from './motor';
import { formatFrequency, populationName, Trajectory } from './Trajectory';

import { Experiments } from './Experiments';
import { AlleleLegend, PopulationLab } from './PopulationLab';
import { TimeControls } from './TimeControls';
import { generationInterval, supportsWebGL, useReducedMotion } from './labMotion';

export function App() {
  const [parameters, setParameters] = useState(example);
  const [formVersion, setFormVersion] = useState(0);
  const [hypothesis, setHypothesis] = useState('');
  const [generation, setGeneration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [flat, setFlat] = useState(false);
  const [webgl] = useState(supportsWebGL);
  const reducedMotion = useReducedMotion();
  const paths = useMemo(() => compare(parameters), [parameters]);
  const finished = generation === parameters.generations;

  useEffect(() => {
    if (!playing || finished) return;
    const timer = window.setTimeout(() => {
      setGeneration(generation + 1);
      if (generation + 1 === parameters.generations) setPlaying(false);
    }, generationInterval);
    return () => window.clearTimeout(timer);
  }, [finished, generation, parameters, playing]);

  function seek(next: number) {
    setPlaying(false);
    setGeneration(next);
  }

  function reset() {
    seek(0);
  }

  function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setParameters({
      sizes: [Number(data.get('sizeA')), Number(data.get('sizeB'))],
      initial: Number(data.get('frequency')) / 100,
      generations: Number(data.get('generations')),
      seed: Number(data.get('seed')),
    });
    reset();
  }

  return <>
    <main className="shell">
      <header className="exhibit-header">
        <div>
          <h1>Deriva genética</h1>
          <p>Observa cómo cambia una población cuando el azar decide qué alelos pasan a la siguiente generación.</p>
        </div>
        <nav className="exhibit-nav" aria-label="Secciones del experimento">
          <a href="#trayectorias">Trayectorias</a>
          <a href="#replicas">Réplicas</a>
        </nav>
      </header>
      <details className="parameters">
        <summary>Parámetros del experimento</summary>
        <div className="setup">
          <div className="setup-heading"><h2>Configuración</h2><button className="text-button" onClick={() => {
            setParameters(example);
            setFormVersion(formVersion + 1);
            reset();
          }}>Cargar ejemplo</button></div>
          <form key={formVersion} onSubmit={configure}>
            <fieldset>
              <legend>Tamaño de las poblaciones</legend>
              <div className="fields">
                <label className="series-a">Población A<input name="sizeA" type="number" min="1" max={limits.size} defaultValue={parameters.sizes[0]} required /></label>
                <label className="series-b">Población B<input name="sizeB" type="number" min="1" max={limits.size} defaultValue={parameters.sizes[1]} required /></label>
              </div>
            </fieldset>
            <label>Frecuencia inicial del alelo A (%)<input name="frequency" type="number" min="0" max="100" step="any" defaultValue={parameters.initial * 100} required /></label>
            <div className="fields">
              <label>Generaciones<input name="generations" type="number" min="1" max={limits.generations} defaultValue={parameters.generations} required /></label>
              <label>Semilla<input name="seed" type="number" min="0" max={limits.seed} defaultValue={parameters.seed} required /></label>
            </div>
              <label className="hypothesis">Tu hipótesis
                <textarea rows={2} value={hypothesis} onChange={event => setHypothesis(event.target.value)}
                  placeholder="¿En cuál población esperas más dispersión?" />
              </label>
            <button className="primary" type="submit">Aplicar parámetros</button>
          </form>
          <div className="initial">
            <strong>Frecuencia inicial efectiva</strong>
            {parameters.sizes.map((size, index) => {
              const copies = initialCopies(size, parameters.initial);
              return <div key={index}><span>{populationName(index)}</span><span>{copies}/{2 * size} · {formatFrequency(copies / (2 * size))}</span></div>;
            })}
          </div>
        </div>
      </details>
      <section className="lab" aria-label="Cámaras de población">
        <TimeControls generation={generation} total={parameters.generations} playing={playing}
          toggle={() => setPlaying(!playing)} seek={seek} reset={reset} />
        <div className="chambers">
          {paths.map((path, population) => <PopulationLab key={population} population={population}
            size={parameters.sizes[population]} generation={generation} frequency={path[generation]} seed={parameters.seed} flat={flat || !webgl} reducedMotion={reducedMotion}
            endpoint={path.findIndex(value => value === 0 || value === 1)} />)}
        </div>
        <div className="lab-footer">
          <AlleleLegend />
          {webgl
            ? <button className="mode-toggle" type="button" aria-pressed={flat} onClick={() => setFlat(!flat)}>Vista 2D</button>
            : <span className="mode-notice">Vista 2D · WebGL no disponible</span>}
        </div>
      </section>
        <section id="trayectorias" className="panel chart" aria-labelledby="chart-heading">
          <div className="chart-heading"><div><h2 id="chart-heading">Trayectorias</h2><p>Frecuencia del alelo A</p></div>
            <output className="counter" aria-live="off">Generación <strong>{generation} / {parameters.generations}</strong></output></div>
          <div className="readouts">
            {paths.map((path, index) => {
              const endpoint = path.findIndex(value => value === 0 || value === 1);
              return <div key={index} className={index === 0 ? 'series-a' : 'series-b'}>
                <span className="series-label">{populationName(index)} · N = {parameters.sizes[index]}</span>
                <strong>{formatFrequency(path[generation])}</strong>
                {endpoint >= 0 && endpoint <= generation && <small>{path[endpoint] === 0 ? 'Pérdida' : 'Fijación'} · gen. {endpoint}</small>}
              </div>;
            })}
          </div>
          <Trajectory paths={paths} generation={generation} total={parameters.generations} />
        </section>
      <Experiments key={formVersion + JSON.stringify(parameters)} parameters={parameters} />
      <section className="model">
        <h2>Cómo funciona el modelo</h2>
        <p>Cada población diploide tiene N individuos y 2N copias del gen. En cada generación se sortean 2N copias con reemplazo según la frecuencia anterior. El tamaño se mantiene constante y cada copia del gen tiene la misma probabilidad de ser elegida. El modelo excluye selección, mutación y migración.</p>
        <p>Una corrida individual puede mostrar un resultado distinto del patrón observado al repetir el experimento.</p>
      </section>
    </main>
  </>;
}
