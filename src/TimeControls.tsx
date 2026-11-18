import type { CSSProperties } from 'react';

export function TimeControls({ generation, total, playing, toggle, seek, reset }: {
  generation: number; total: number; playing: boolean;
  toggle: () => void; seek: (generation: number) => void; reset: () => void;
}) {
  return <div className="time-controls" role="group" aria-label="Tiempo del experimento">
    <div className="time-buttons">
      <button type="button" className="play-button" onClick={toggle}>
        <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span> {playing ? 'Pausar' : 'Reproducir'}
      </button>
      <button type="button" className="time-step" aria-label="Retroceder 1 generación"
        title="Retroceder 1 generación" disabled={generation === 0} onClick={() => seek(generation - 1)}>−1</button>
      <button type="button" className="time-step" aria-label="Avanzar 1 generación"
        title="Avanzar 1 generación" disabled={generation === total} onClick={() => seek(generation + 1)}>+1</button>
      <button type="button" className="time-reset" onClick={reset}>Reiniciar</button>
    </div>
    <div className="scrubber">
      <label htmlFor="generation-timeline">Línea de tiempo</label>
      <output htmlFor="generation-timeline" aria-live="off">Generación <strong>{generation}</strong><span> / {total}</span></output>
      <input id="generation-timeline" type="range" min={0} max={total} step={1} value={generation}
        style={{ '--progress': `${generation / total * 100}%` } as CSSProperties}
        aria-valuetext={`Generación ${generation} de ${total}`} onChange={event => seek(Number(event.target.value))} />
    </div>
  </div>;
}
