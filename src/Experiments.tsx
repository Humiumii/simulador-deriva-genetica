import { useEffect, useRef, useState } from 'react';
import type { Parameters } from './motor';
import { replicaCount, summarize, toCsv } from './replicas';
import { formatFrequency, populationName } from './Trajectory';

const labels = ['0', ...Array.from({ length: 10 }, (_, i) => `${i * 10}–${i * 10 + 10}`), '100'];
const binNames = labels.map((label, i) => i === 0 || i === 11 ? `${label} %` : `Intervalo ${label} %, extremos absorbentes excluidos`);
const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });

export function Experiments({ parameters }: { parameters: Parameters }) {
  const [values, setValues] = useState<number[][] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => workerRef.current?.terminate(), []);

  function run() {
    setError(false);
    setRunning(true);
    const worker = new Worker(new URL('./replicas.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    function finish() {
      worker.terminate();
      workerRef.current = null;
      setRunning(false);
    }
    worker.onmessage = (event: MessageEvent<number[][]>) => {
      setValues(event.data);
      finish();
    };
    worker.onerror = () => {
      setError(true);
      finish();
    };
    worker.postMessage(parameters);
  }

  function download() {
    if (!values) return;
    const url = URL.createObjectURL(new Blob([toCsv(parameters, values)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `deriva-semilla-${parameters.seed}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const stats = values?.map(summarize);
  const maximum = stats ? Math.max(1, ...stats.flatMap(item => item.bins)) : 1;
  return <section className="panel experiments" aria-labelledby="experiments-heading">
    <div className="chart-heading">
      <div><h2 id="experiments-heading">Experimentos repetidos</h2>
        <p>Compara la frecuencia final en {replicaCount} réplicas por población.</p></div>
      <div className="actions">
        <button className="primary" onClick={run} disabled={running}>{running ? 'Calculando…' : 'Ejecutar 100 réplicas'}</button>
        <button onClick={download} disabled={!values || running}>Descargar CSV</button>
      </div>
    </div>
    <div className="run-status" role="status">
      {error ? 'No se pudieron calcular las réplicas. Vuelve a intentarlo.' : running ? 'Calculando la distribución final.' : stats ? `Generación ${parameters.generations} · Semilla ${parameters.seed}` : ''}
    </div>
    {stats && <>
      <div className="replica-grid">
        {stats.map((item, i) => <div key={i} className={i === 0 ? 'series-a' : 'series-b'}>
          <h3 className="series-label">{populationName(i)} · N = {parameters.sizes[i]}</h3>
          <dl className="statistics">
            <div><dt>Pérdida</dt><dd data-stat="lost">{item.lost}</dd></div>
            <div><dt>Fijación</dt><dd data-stat="fixed">{item.fixed}</dd></div>
            <div><dt>Media final</dt><dd data-stat="mean">{formatFrequency(item.mean)}</dd></div>
            <div><dt>Desv. estándar</dt><dd data-stat="deviation">{decimal.format(item.deviation * 100)} pp</dd></div>
          </dl>
        </div>)}
      </div>
      <figure className="histogram">
        <figcaption>Frecuencia final del alelo A (%) · Altura máxima de la escala: {maximum} réplicas</figcaption>
        <div className="bins">
          {labels.map((label, index) => <div key={label} className="bin" aria-label={binNames[index]}>
            <div className="bars">
              {stats.map((item, population) => <div key={population} className={population === 0 ? 'series-a' : 'series-b'}
                style={{ height: `${100 * item.bins[index] / maximum}%` }}
                title={`${populationName(population)}: ${item.bins[index]} réplicas`}
                aria-label={`${populationName(population)}: ${item.bins[index]} réplicas`} role="img" />)}
            </div>
            <span>{label}</span>
          </div>)}
        </div>
      </figure>
    </>}
  </section>;
}
