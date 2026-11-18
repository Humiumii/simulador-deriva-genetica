const percent = new Intl.NumberFormat('es-CL', { style: 'percent', maximumFractionDigits: 2 });
export const formatFrequency = (value: number) => percent.format(value);
export const populationName = (index: number) => index === 0 ? 'Población A' : 'Población B';

const left = 58;
const right = 730;
const top = 18;
const bottom = 266;

export function Trajectory({ paths, generation, total }: {
  paths: number[][]; generation: number; total: number;
}) {
  const x = (step: number) => left + step / total * (right - left);
  const y = (frequency: number) => bottom - frequency * (bottom - top);
  const xTicks = [...new Set(Array.from({ length: 6 }, (_, index) => Math.round(total * index / 5)))];

  return <svg className="trajectory" viewBox="0 0 750 320" role="img" aria-labelledby="trajectory-title">
    <title id="trajectory-title">Frecuencia del alelo A por generación. {paths.map((path, i) =>
      `${populationName(i)}: ${formatFrequency(path[generation])}`).join('. ')}</title>
    {[0, 0.25, 0.5, 0.75, 1].map(tick => <g key={tick}>
      <line x1={left} x2={right} y1={y(tick)} y2={y(tick)} className={tick === 0 || tick === 1 ? 'boundary' : 'gridline'} />
      <text x={left - 9} y={y(tick)} dy=".35em" textAnchor="end">{formatFrequency(tick)}</text>
    </g>)}
    {xTicks.map(tick => <g key={tick}>
      <line x1={x(tick)} x2={x(tick)} y1={top} y2={bottom} className="gridline" />
      <text x={x(tick)} y={288} textAnchor="middle">{tick}</text>
    </g>)}
    <text x={(left + right) / 2} y={314} textAnchor="middle">Generación</text>
    {paths.map((path, index) => {
      const endpoint = path.findIndex(value => value === 0 || value === 1);
      return <g key={index} className={index === 0 ? 'series-a' : 'series-b'}>
        <polyline className="path" points={path.slice(0, generation + 1).map((value, step) => [x(step), y(value)].join(',')).join(' ')} />
        {endpoint >= 0 && endpoint <= generation && <circle className="endpoint" cx={x(endpoint)} cy={y(path[endpoint])} r={8}>
          <title>{path[endpoint] === 0 ? 'Pérdida' : 'Fijación'} en generación {endpoint}</title>
        </circle>}
        {index === 0
          ? <circle className="marker" cx={x(generation)} cy={y(path[generation])} r={5} />
          : <rect className="marker" x={x(generation) - 3} y={y(path[generation]) - 3} width={6} height={6} />}
      </g>;
    })}
  </svg>;
}
