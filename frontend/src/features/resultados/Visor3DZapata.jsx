import { useMemo, useState } from 'react';
import { ArrowLeft, Box, Grid3X3, Ruler, Layers } from 'lucide-react';

// Proyección isométrica: (X, Y, Z) en metros -> (sx, sy) en el SVG.
const COS30 = 0.8660254;
const SIN30 = 0.5;

function extraerNumeros(texto, cantidad) {
  const nums = String(texto || '').match(/[\d.]+/g) || [];
  const vals = nums.map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n));
  while (vals.length < cantidad) vals.push(cantidad === 3 ? 1 : 0);
  return vals.slice(0, cantidad);
}

function primerNumero(texto) {
  const m = String(texto || '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

export default function Visor3DZapata({ fila, resumen, onVolver }) {
  const [verHormigon, setVerHormigon] = useState(true);
  const [verMalla, setVerMalla] = useState(true);
  const [verPedestal, setVerPedestal] = useState(true);
  const [verCotas, setVerCotas] = useState(true);

  // Dimensiones físicas reales de la fila (X × Y × h en metros).
  const [dimX, dimY, dimH] = useMemo(
    () => extraerNumeros(fila?.dimensiones, 3),
    [fila]
  );
  const volUnitario = useMemo(() => primerNumero(fila?.volUnitario), [fila]);
  const cantidad = Number(fila?.cantidad) || 0;

  // Desglose de acero: ratio global real (kg/m³) × volumen de la fila.
  // Todo calculado en vivo desde el resumen del motor, sin valores fijos.
  const acero = useMemo(() => {
    const pesoTotal = Number(resumen?.peso_acero_kg) || 0;
    const volTotal = Number(resumen?.volumen_hormigon_m3) || 0;
    const ratio = volTotal > 0 ? pesoTotal / volTotal : 0;
    const estimadoUnitario = ratio * volUnitario;
    return { pesoTotal, volTotal, ratio, estimadoUnitario, estimadoTipo: estimadoUnitario * cantidad };
  }, [resumen, volUnitario, cantidad]);

  // Geometría isométrica calculada desde las dimensiones reales.
  const geo = useMemo(() => {
    const x = Math.max(dimX, 0.01);
    const y = Math.max(dimY, 0.01);
    const h = Math.max(dimH, 0.01);
    const hp = h * 0.9; // altura visible del pedestal sobre el bloque
    const cx = 300;
    const cy = 300;
    const s = 190 / Math.max(x + y, (h + hp) * 2.4);
    const p = (X, Y, Z) => [cx + (X - Y) * COS30 * s, cy + (X + Y) * SIN30 * s - Z * s];
    const pts = (lista) => lista.map(([X, Y, Z]) => p(X, Y, Z).join(',')).join(' ');

    // Malla inferior: retícula en ambos sentidos a altura de recubrimiento.
    const zr = Math.min(0.075, h * 0.2);
    const n = 5;
    const malla = [];
    for (let i = 0; i <= n; i++) {
      const fx = (x * i) / n;
      const fy = (y * i) / n;
      malla.push([p(0, fy, zr), p(x, fy, zr)]); // barras en X
      malla.push([p(fx, 0, zr), p(fx, y, zr)]); // barras en Y
    }

    // Pedestal: 4 barras verticales en el núcleo central + ganchos de anclaje.
    const mx0 = x * 0.35;
    const mx1 = x * 0.65;
    const my0 = y * 0.35;
    const my1 = y * 0.65;
    const g = Math.min(x, y) * 0.12; // longitud del gancho de anclaje
    const esquinas = [[mx0, my0], [mx1, my0], [mx1, my1], [mx0, my1]];
    const barras = esquinas.map(([bx, by]) => ({
      vertical: [p(bx, by, 0), p(bx, by, h + hp)],
      gancho: [p(bx, by, 0), p(Math.max(bx - g, 0), Math.max(by - g, 0), 0)],
    }));
    // Estribos del pedestal a 3 alturas.
    const estribos = [0.35, 0.6, 0.85].map((f) => {
      const z = h + hp * f;
      return pts([[mx0, my0, z], [mx1, my0, z], [mx1, my1, z], [mx0, my1, z]]);
    });

    return {
      s, hp,
      top: pts([[0, 0, h], [x, 0, h], [x, y, h], [0, y, h]]),
      caraX: pts([[x, 0, 0], [x, y, 0], [x, y, h], [x, 0, h]]),
      caraY: pts([[0, y, 0], [x, y, 0], [x, y, h], [0, y, h]]),
      aristaTX: [p(x, 0, h), p(x, 0, 0)],
      aristaTY: [p(0, y, h), p(0, y, 0)],
      aristaH: [p(x, y, 0), p(x, y, h)],
      baseXY: [p(0, 0, 0), p(x, 0, 0), p(x, y, 0), p(0, y, 0)],
      oculta1: [p(0, 0, 0), p(0, 0, h)],
      malla, barras, estribos,
      cotaX: [p(0, 0, 0), p(x, 0, 0)],
      cotaY: [p(x, 0, 0), p(x, y, 0)],
      cotaH: [p(x, y, 0), p(x, y, h)],
    };
  }, [dimX, dimY, dimH]);

  const seg = ([a, b]) => `${a[0]},${a[1]} ${b[0]},${b[1]}`;
  const nombre = `Fundación ${fila?.tipo || ''}`;

  const toggles = [
    { activo: verHormigon, set: setVerHormigon, icono: Box, texto: 'Hormigón' },
    { activo: verMalla, set: setVerMalla, icono: Grid3X3, texto: 'Malla inf.' },
    { activo: verPedestal, set: setVerPedestal, icono: Layers, texto: 'Pedestal' },
    { activo: verCotas, set: setVerCotas, icono: Ruler, texto: 'Cotas' },
  ];

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-fadeIn pb-12">
      {/* Botón flotante volver */}
      <button
        onClick={onVolver}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b121f] text-slate-100 text-xs font-bold shadow-lg hover:bg-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ← Volver al listado general
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Lienzo CAD/BIM */}
        <div className="bg-[#0b121f] border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="px-5 pt-4 flex flex-wrap items-center gap-2">
            {toggles.map((t) => {
              const Icono = t.icono;
              return (
                <button
                  key={t.texto}
                  onClick={() => t.set(!t.activo)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    t.activo
                      ? 'bg-teal-500/15 text-teal-300 border-teal-500/40'
                      : 'bg-slate-800/60 text-slate-500 border-slate-700/60'
                  }`}
                >
                  <Icono className="h-3 w-3" /> {t.texto}
                </button>
              );
            })}
          </div>

          <svg viewBox="0 0 640 480" className="w-full h-auto select-none">
            {/* Bloque de hormigón translúcido */}
            <g style={{ transition: 'opacity 0.4s', opacity: verHormigon ? 1 : 0.12 }}>
              <polygon points={geo.caraY} fill="#334155" fillOpacity="0.35" stroke="#64748b" strokeWidth="1.5" />
              <polygon points={geo.caraX} fill="#475569" fillOpacity="0.35" stroke="#64748b" strokeWidth="1.5" />
              <polygon points={geo.top} fill="#5eead4" fillOpacity="0.18" stroke="#2dd4bf" strokeWidth="1.5" />
              {/* Aristas ocultas */}
              <polyline points={`${seg(geo.oculta1)}`} fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="5 4" />
              <polyline points={geo.baseXY.map((q) => q.join(',')).join(' ')} fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="5 4" />
              {/* Aristas visibles */}
              <line x1={geo.aristaTX[0][0]} y1={geo.aristaTX[0][1]} x2={geo.aristaTX[1][0]} y2={geo.aristaTX[1][1]} stroke="#94a3b8" strokeWidth="1.5" />
              <line x1={geo.aristaTY[0][0]} y1={geo.aristaTY[0][1]} x2={geo.aristaTY[1][0]} y2={geo.aristaTY[1][1]} stroke="#94a3b8" strokeWidth="1.5" />
              <line x1={geo.aristaH[0][0]} y1={geo.aristaH[0][1]} x2={geo.aristaH[1][0]} y2={geo.aristaH[1][1]} stroke="#94a3b8" strokeWidth="1.5" />
            </g>

            {/* Malla de acero inferior */}
            {verMalla && (
              <g style={{ transition: 'opacity 0.4s' }} stroke="#22d3ee" strokeWidth="1.6" opacity="0.9">
                {geo.malla.map((l, i) => (
                  <line key={i} x1={l[0][0]} y1={l[0][1]} x2={l[1][0]} y2={l[1][1]} />
                ))}
              </g>
            )}

            {/* Pedestal: barras verticales + ganchos + estribos */}
            {verPedestal && (
              <g style={{ transition: 'opacity 0.4s' }}>
                {geo.estribos.map((ptsStr, i) => (
                  <polygon key={`e${i}`} points={ptsStr} fill="none" stroke="#67e8f9" strokeWidth="1.2" opacity="0.85" />
                ))}
                {geo.barras.map((b, i) => (
                  <g key={i} stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round">
                    <line x1={b.vertical[0][0]} y1={b.vertical[0][1]} x2={b.vertical[1][0]} y2={b.vertical[1][1]} />
                    <line x1={b.gancho[0][0]} y1={b.gancho[0][1]} x2={b.gancho[1][0]} y2={b.gancho[1][1]} stroke="#22d3ee" />
                    <circle cx={b.vertical[1][0]} cy={b.vertical[1][1]} r="2.5" fill="#22d3ee" stroke="none" />
                  </g>
                ))}
              </g>
            )}

            {/* Cotas */}
            {verCotas && (
              <g fontSize="12" fontFamily="monospace" fill="#e2e8f0">
                <line x1={geo.cotaX[0][0]} y1={geo.cotaX[0][1] + 14} x2={geo.cotaX[1][0]} y2={geo.cotaX[1][1] + 14} stroke="#e2e8f0" strokeWidth="1" />
                <text x={(geo.cotaX[0][0] + geo.cotaX[1][0]) / 2} y={(geo.cotaX[0][1] + geo.cotaX[1][1]) / 2 + 30} textAnchor="middle">X = {dimX} m</text>
                <line x1={geo.cotaY[0][0] + 14} y1={geo.cotaY[0][1]} x2={geo.cotaY[1][0] + 14} y2={geo.cotaY[1][1]} stroke="#e2e8f0" strokeWidth="1" />
                <text x={(geo.cotaY[0][0] + geo.cotaY[1][0]) / 2 + 34} y={(geo.cotaY[0][1] + geo.cotaY[1][1]) / 2} textAnchor="middle">Y = {dimY} m</text>
                <line x1={geo.cotaH[0][0] + 14} y1={geo.cotaH[0][1]} x2={geo.cotaH[1][0]} y2={geo.cotaH[1][1]} stroke="#e2e8f0" strokeWidth="1" />
                <text x={(geo.cotaH[0][0] + geo.cotaH[1][0]) / 2 + 40} y={(geo.cotaH[0][1] + geo.cotaH[1][1]) / 2} textAnchor="middle">h = {dimH} m</text>
              </g>
            )}
          </svg>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <div className="bg-[#0b121f] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Inspección 3D</span>
            <h2 className="text-3xl font-black text-slate-100 tracking-tight mt-1">{nombre}</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">{fila?.dimensiones || '—'} m · ×{cantidad} u.</p>
          </div>

          <div className="bg-[#0b121f] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hormigón</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Vol. unitario</span>
              <span className="text-lg font-black text-teal-300 font-mono">{fila?.volUnitario || '—'}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Vol. total tipo</span>
              <span className="text-lg font-black text-slate-100 font-mono">{fila?.volTotal || '—'}</span>
            </div>
          </div>

          <div className="bg-[#0b121f] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acero estimado</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Ratio global</span>
              <span className="text-sm font-bold text-cyan-300 font-mono">{acero.ratio.toFixed(2)} kg/m³</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Por zapata</span>
              <span className="text-sm font-bold text-cyan-300 font-mono">{acero.estimadoUnitario.toFixed(2)} kg</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Total tipo ({cantidad} u.)</span>
              <span className="text-sm font-bold text-cyan-300 font-mono">{acero.estimadoTipo.toFixed(2)} kg</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">Estimado prorrateado del peso total ({acero.pesoTotal.toFixed(1)} kg) según volumen. Incluye malla inferior + pedestal con ganchos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
