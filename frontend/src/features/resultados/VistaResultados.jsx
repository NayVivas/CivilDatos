import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, RefreshCw, Box, Eye, ZoomIn, ZoomOut, Maximize, ArrowLeft, Boxes, Image, HelpCircle, X } from 'lucide-react';
import Visor3DZapata from './Visor3DZapata';

const ISO_COS = 0.8660254;
const ISO_SIN = 0.5;

function numerosDe(texto, cantidad) {
  const nums = String(texto || '').match(/[\d.]+/g) || [];
  const vals = nums.map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n));
  while (vals.length < cantidad) vals.push(1);
  return vals.slice(0, cantidad);
}

// Maqueta isométrica global: un cubo por zapata sobre la grilla estructural.
function MaquetaGlobal({ filas, detecciones, zoom = 1 }) {
  const geo = useMemo(() => {
    const dimsPorTipo = {};
    (filas || []).forEach((fila) => {
      const [x, y, h] = numerosDe(fila.dimensiones, 3);
      dimsPorTipo[String(fila.tipo).toUpperCase()] = {
        x: Math.max(x, 0.2),
        y: Math.max(y, 0.2),
        h: Math.max(h, 0.1),
        cantidad: Number(fila.cantidad) || 0,
      };
    });
    const tipos = Object.keys(dimsPorTipo);
    if (tipos.length === 0) return null;

    // Nodos: una zapata real por detección (centros pymupdf normalizados).
    // Fallback: un nodo por tipo en grilla compacta si no hay detecciones.
    const dets = (detecciones || []).filter(
      (d) => d && dimsPorTipo[String(d.referencia || '').toUpperCase()]
    );
    let nodos;
    if (dets.length > 0) {
      const cxs = dets.map((d) => Number(d.centro_x) || 0);
      const cys = dets.map((d) => Number(d.centro_y) || 0);
      const minCx = Math.min(...cxs);
      const maxCx = Math.max(...cxs);
      const minCy = Math.min(...cys);
      const maxCy = Math.max(...cys);
      const spanX = maxCx - minCx || 1;
      const spanY = maxCy - minCy || 1;
      const esc = Math.max(...tipos.map((t) => Math.max(dimsPorTipo[t].x, dimsPorTipo[t].y))) * 6;
      nodos = dets.map((d) => {
        const t = dimsPorTipo[String(d.referencia).toUpperCase()];
        return {
          tipo: String(d.referencia).toUpperCase(),
          ...t,
          // Plano proporcional al PDF: X directa, Y invertida (norte arriba).
          X0: ((Number(d.centro_x) - minCx) / spanX) * esc,
          Y0: ((maxCy - Number(d.centro_y)) / spanY) * esc,
        };
      });
    } else {
      const n = tipos.length;
      const cols = Math.ceil(Math.sqrt(n));
      const maxD = Math.max(...tipos.map((t) => Math.max(dimsPorTipo[t].x, dimsPorTipo[t].y)));
      const gap = maxD * 0.55 + 0.4;
      nodos = tipos.map((t, i) => ({
        tipo: t,
        ...dimsPorTipo[t],
        X0: (i % cols) * (maxD + gap),
        Y0: Math.floor(i / cols) * (maxD + gap),
      }));
    }

    const maxH = Math.max(...tipos.map((t) => dimsPorTipo[t].h));
    nodos.forEach((d) => {
      d.cx = d.X0 + d.x / 2;
      d.cy = d.Y0 + d.y / 2;
      d.ph = maxH * 0.55; // pedestal visible sobre el bloque
      d.ps = Math.min(d.x, d.y) * 0.15;
    });

    // Proyección isométrica unitaria (centrada en origen).
    const p = (X, Y, Z) => [(X - Y) * ISO_COS, (X + Y) * ISO_SIN - Z];

    // Vigas de riostra esmeralda: cada pedestal con su vecino más cercano.
    const vistos = new Set();
    const riostras = [];
    nodos.forEach((a, i) => {
      let mejor = -1;
      let mejorD = Infinity;
      nodos.forEach((b, j) => {
        if (i === j) return;
        const dist = (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
        if (dist < mejorD) {
          mejorD = dist;
          mejor = j;
        }
      });
      if (mejor >= 0) {
        const clave = `${Math.min(i, mejor)}-${Math.max(i, mejor)}`;
        if (!vistos.has(clave)) {
          vistos.add(clave);
          riostras.push([a, nodos[mejor]]);
        }
      }
    });

    // Etiquetas agrupadas por tipo en el centroide (una sola por tipo).
    const etiquetas = tipos.map((t) => {
      const delTipo = nodos.filter((d) => d.tipo === t);
      return {
        tipo: t,
        cantidad: dimsPorTipo[t].cantidad,
        cx: delTipo.reduce((s, d) => s + d.cx, 0) / delTipo.length,
        cy: delTipo.reduce((s, d) => s + d.cy, 0) / delTipo.length,
        z: Math.max(...delTipo.map((d) => d.h + d.ph)),
      };
    });

    // Grilla de fondo sobre la envolvente de los nodos.
    const allX = nodos.flatMap((d) => [d.X0, d.X0 + d.x]);
    const allY = nodos.flatMap((d) => [d.Y0, d.Y0 + d.y]);
    const gx0 = Math.min(...allX);
    const gx1 = Math.max(...allX);
    const gy0 = Math.min(...allY);
    const gy1 = Math.max(...allY);
    const paso = Math.max((gx1 - gx0) / 12, (gy1 - gy0) / 12, 0.5);
    const fondo = [];
    for (let gx = gx0 - paso; gx <= gx1 + paso; gx += paso) fondo.push([[gx, gy0 - paso], [gx, gy1 + paso]]);
    for (let gy = gy0 - paso; gy <= gy1 + paso; gy += paso) fondo.push([[gx0 - paso, gy], [gx1 + paso, gy]]);

    // Encuadre en píxeles (proyección calculada en JS: el texto queda en px reales).
    const ptsClave = [];
    nodos.forEach((d) => {
      ptsClave.push(p(d.X0, d.Y0, 0), p(d.X0 + d.x, d.Y0 + d.y, d.h), p(d.cx, d.cy, d.h + d.ph));
    });
    fondo.forEach((l) => l.forEach(([X, Y]) => ptsClave.push(p(X, Y, 0))));
    const uxs = ptsClave.map((q) => q[0]);
    const uys = ptsClave.map((q) => q[1]);
    const minUx = Math.min(...uxs);
    const maxUx = Math.max(...uxs);
    const minUy = Math.min(...uys);
    const maxUy = Math.max(...uys);
    const k = Math.min(940 / (maxUx - minUx), 540 / (maxUy - minUy)) * zoom;
    const bcx = (minUx + maxUx) / 2;
    const bcy = (minUy + maxUy) / 2;
    const S = (X, Y, Z) => {
      const [ux, uy] = p(X, Y, Z);
      return [500 + k * (ux - bcx), 315 + k * (uy - bcy)];
    };
    const poly = (lista) => lista.map(([X, Y, Z]) => S(X, Y, Z).join(',')).join(' ');
    const segm = (a, b) => `${a.join(',')} ${b.join(',')}`;
    return { nodos, etiquetas, riostras, fondo, zR: maxH, S, poly, segm };
  }, [filas, detecciones, zoom]);

  if (!geo) return <p className="text-slate-400 text-xs italic p-12">Sin zapatas para modelar.</p>;

  return (
    <svg viewBox="0 0 1000 620" className="w-full h-auto select-none">
      {/* Cuadrícula de fondo */}
      <g stroke="#1e293b" strokeWidth="1">
        {geo.fondo.map((l, i) => (
          <line key={i} x1={geo.S(l[0][0], l[0][1], 0)[0]} y1={geo.S(l[0][0], l[0][1], 0)[1]} x2={geo.S(l[1][0], l[1][1], 0)[0]} y2={geo.S(l[1][0], l[1][1], 0)[1]} />
        ))}
      </g>
      {/* Vigas de riostra esmeralda entre pedestales */}
      <g stroke="#34d399" strokeWidth="2" opacity="0.8">
        {geo.riostras.map(([a, b], i) => (
          <line
            key={i}
            x1={geo.S(a.cx, a.cy, geo.zR)[0]} y1={geo.S(a.cx, a.cy, geo.zR)[1]}
            x2={geo.S(b.cx, b.cy, geo.zR)[0]} y2={geo.S(b.cx, b.cy, geo.zR)[1]}
          />
        ))}
      </g>
      {/* Cubos de zapatas en posiciones reales del plano */}
      {geo.nodos.map((d, i) => (
        <g key={i} opacity="0.92">
          <polygon points={geo.poly([[d.X0 + d.x, d.Y0, 0], [d.X0 + d.x, d.Y0 + d.y, 0], [d.X0 + d.x, d.Y0 + d.y, d.h], [d.X0 + d.x, d.Y0, d.h]])} fill="#475569" fillOpacity="0.32" stroke="#64748b" strokeWidth="1.2" />
          <polygon points={geo.poly([[d.X0, d.Y0 + d.y, 0], [d.X0 + d.x, d.Y0 + d.y, 0], [d.X0 + d.x, d.Y0 + d.y, d.h], [d.X0, d.Y0 + d.y, d.h]])} fill="#334155" fillOpacity="0.32" stroke="#64748b" strokeWidth="1.2" />
          <polygon points={geo.poly([[d.X0, d.Y0, d.h], [d.X0 + d.x, d.Y0, d.h], [d.X0 + d.x, d.Y0 + d.y, d.h], [d.X0, d.Y0 + d.y, d.h]])} fill="#5eead4" fillOpacity="0.16" stroke="#2dd4bf" strokeWidth="1.2" />
          {/* Pedestal */}
          <polygon points={geo.poly([[d.cx - d.ps, d.cy - d.ps, d.h + d.ph], [d.cx + d.ps, d.cy - d.ps, d.h + d.ph], [d.cx + d.ps, d.cy + d.ps, d.h + d.ph], [d.cx - d.ps, d.cy + d.ps, d.h + d.ph]])} fill="none" stroke="#67e8f9" strokeWidth="1.2" />
          <line x1={geo.S(d.cx - d.ps, d.cy - d.ps, d.h)[0]} y1={geo.S(d.cx - d.ps, d.cy - d.ps, d.h)[1]} x2={geo.S(d.cx - d.ps, d.cy - d.ps, d.h + d.ph)[0]} y2={geo.S(d.cx - d.ps, d.cy - d.ps, d.h + d.ph)[1]} stroke="#a5f3fc" strokeWidth="1.6" />
          <line x1={geo.S(d.cx + d.ps, d.cy + d.ps, d.h)[0]} y1={geo.S(d.cx + d.ps, d.cy + d.ps, d.h)[1]} x2={geo.S(d.cx + d.ps, d.cy + d.ps, d.h + d.ph)[0]} y2={geo.S(d.cx + d.ps, d.cy + d.ps, d.h + d.ph)[1]} stroke="#a5f3fc" strokeWidth="1.6" />
        </g>
      ))}
      {/* Etiquetas agrupadas por tipo, flotando sobre cada grupo */}
      {geo.etiquetas.map((e) => (
        <text
          key={e.tipo}
          x={geo.S(e.cx, e.cy, e.z)[0]}
          y={geo.S(e.cx, e.cy, e.z)[1]}
          dy="-15"
          textAnchor="middle"
          className="text-[10px] font-bold fill-slate-300"
          fontFamily="monospace"
        >
          {e.tipo} ×{e.cantidad}
        </text>
      ))}
    </svg>
  );
}

export default function VistaResultados({ datos, resetear }) {
  const [vistaActiva, setVistaActiva] = useState('resumen');
  const [zapataAuditar, setZapataAuditar] = useState(null);
  const [verPlanoCompleto, setVerPlanoCompleto] = useState(false);
  const [modoPlano, setModoPlano] = useState('3d'); // '3d' maqueta | '2d' plano analítico
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Human-in-the-loop: calibración manual de dimensiones por zapata.
  const [tablaEditada, setTablaEditada] = useState(datos?.tabla_fundaciones ?? []);
  const [metricasEditadas, setMetricasEditadas] = useState(datos?.metricas_globales ?? {});
  const [filaEditando, setFilaEditando] = useState(null);
  const [valoresForm, setValoresForm] = useState({ x: '', y: '', h: '' });

  // Si llega un nuevo análisis, se resetea la tabla editable.
  useEffect(() => {
    setTablaEditada(datos?.tabla_fundaciones ?? []);
    setMetricasEditadas(datos?.metricas_globales ?? {});
    setFilaEditando(null);
  }, [datos]);

  const abrirCorreccion = (fila) => {
    const [x, y, h] = numerosDe(fila.dimensiones, 3);
    setValoresForm({ x: String(x), y: String(y), h: String(h) });
    setFilaEditando(fila);
  };

  const guardarCambios = () => {
    const px = parseFloat(String(valoresForm.x).replace(',', '.'));
    const py = parseFloat(String(valoresForm.y).replace(',', '.'));
    const ph = parseFloat(String(valoresForm.h).replace(',', '.'));
    if (!filaEditando || [px, py, ph].some((n) => Number.isNaN(n) || n <= 0)) return;

    const fmtVol = (n) => `${parseFloat(n.toFixed(6))} m3`;
    const cantidad = Number(filaEditando.cantidad) || 0;
    const volUnit = px * py * ph;
    const volTot = volUnit * cantidad;
    const clave = filaEditando.id ?? filaEditando.tipo;

    const nuevaTabla = tablaEditada.map((f) =>
      (f.id ?? f.tipo) === clave
        ? { ...f, dimensiones: `${valoresForm.x} x ${valoresForm.y} x ${valoresForm.h}`, volUnitario: fmtVol(volUnit), volTotal: fmtVol(volTot) }
        : f
    );
    const total = nuevaTabla.reduce((acc, f) => acc + (numerosDe(f.volTotal, 1)[0] || 0), 0);

    setTablaEditada(nuevaTabla);
    setMetricasEditadas((m) => ({
      ...m,
      volumen_hormigon_total: fmtVol(total),
      volumen_hormigon_exact_m3: `${parseFloat(total.toFixed(6))}`,
    }));
    setFilaEditando(null);
  };

  // Si por alguna razón no hay datos cargados, muestra un estado vacío preventivo
  if (!datos) return <p className="text-center p-12 text-slate-400">Esperando datos de origen...</p>;

  const { metricas_globales, tabla_fundaciones, nombre_archivo, resumen_crudo, url_plano_png, detecciones } = datos;

  // Vista editable: la tabla y las tarjetas leen el estado local recalibrado.
  const filas = tablaEditada;
  const metricas = { ...metricas_globales, ...metricasEditadas };

  // Visor 3D a pantalla completa: oculta la tabla general.
  if (zapataAuditar) {
    return (
      <Visor3DZapata
        fila={zapataAuditar}
        resumen={resumen_crudo}
        onVolver={() => setZapataAuditar(null)}
      />
    );
  }

  // Visor de plano completo: oculta la tabla sin perder los datos calculados.
  if (verPlanoCompleto) {
    return (
      <div className="space-y-5 max-w-[1400px] mx-auto animate-fadeIn pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setVerPlanoCompleto(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b121f] text-slate-100 text-xs font-bold shadow-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> ← Volver a las tablas
          </button>
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl p-1.5 shadow-sm">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setModoPlano('3d')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${modoPlano === '3d' ? 'bg-[#0b121f] text-teal-300 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Boxes className="h-3.5 w-3.5" /> MAQUETA 3D ESTRUCTURAL
              </button>
              <button
                onClick={() => setModoPlano('2d')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${modoPlano === '2d' ? 'bg-[#0b121f] text-teal-300 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Image className="h-3.5 w-3.5" /> PLANO ANALÍTICO 2D
              </button>
            </div>
            <button
              onClick={() => setMostrarGuia((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${mostrarGuia ? 'bg-teal-500 text-white' : 'bg-[#0b121f] text-teal-300 hover:bg-slate-800'}`}
            >
              <HelpCircle className="h-3.5 w-3.5" /> Manual de Lectura
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Reducir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs font-black text-slate-700 font-mono w-14 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Ampliar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Restablecer zoom"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-[#0b121f] border border-slate-800 rounded-3xl shadow-xl overflow-hidden relative">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              Plano procesado: <span className="font-bold text-slate-200">{nombre_archivo}</span>
            </p>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">
              {modoPlano === '3d' ? 'Gemelo digital estructural' : 'Detecciones del motor'}
            </span>
          </div>
          {modoPlano === '3d' ? (
            <div className="overflow-auto max-h-[75vh] p-2">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.25s' }}>
                <MaquetaGlobal filas={filas} detecciones={detecciones} zoom={1} />
              </div>
            </div>
          ) : (
            <div className="overflow-auto max-h-[75vh] flex justify-center p-4">
              {url_plano_png ? (
                <img
                  src={url_plano_png}
                  alt={`Plano procesado de ${nombre_archivo}`}
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.25s' }}
                  className="max-w-none rounded-xl shadow-2xl"
                />
              ) : (
                <p className="text-slate-400 text-xs italic p-12">Sin imagen disponible para esta sesión.</p>
              )}
            </div>
          )}
          {mostrarGuia && (
            <div className="absolute right-0 top-0 bg-slate-900/95 backdrop-blur text-slate-300 w-80 h-full border-l border-slate-800 shadow-2xl p-6 overflow-y-auto z-30 animate-fadeIn">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h4 className="text-sm font-black text-slate-100 tracking-tight">Guía de lectura técnica</h4>
                <button
                  onClick={() => setMostrarGuia(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                  title="Cerrar guía"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-5 text-xs leading-relaxed">
                <div>
                  <p className="font-black text-teal-300 text-[13px] mb-1">📐 Perspectiva Isométrica</p>
                  <p>Traduce las coordenadas bidimensionales (X, Y) del PDF a una proyección real a 30 grados para mapear la distribución espacial de las zapatas en el terreno.</p>
                </div>
                <div>
                  <p className="font-black text-teal-300 text-[13px] mb-1">🧱 Volumen del Hormigón</p>
                  <p>Los prismas translúcidos inferiores se escalan en tiempo real según las dimensiones (X × Y × h) calculadas por los objetos Decimal de Python, sin errores de redondeo binario.</p>
                </div>
                <div>
                  <p className="font-black text-teal-300 text-[13px] mb-1">🟢 Nodos y Vigas de Riostra</p>
                  <p>Las pirámides truncadas marcan el arranque de pedestales y columnas (asociadas vía columnas.py), y la red de líneas color esmeralda dibuja el entramado estructural y las guías de amarre entre ellos.</p>
                </div>
                <div>
                  <p className="font-black text-teal-300 text-[13px] mb-1">🏷️ Nomenclatura del Cómputo</p>
                  <p>Las etiquetas técnicas (ej: F2 ×9) sintetizan el código de la zapata y la cantidad de repeticiones exactas detectadas por la IA en planta.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fadeIn pb-12">
      
      {/* CARD SUPERIOR DE INFORMACIÓN DEL ARCHIVO */}
      <div className="bg-white border border-slate-200/60 p-4 rounded-xl flex items-center justify-between shadow-sm">
        <p className="text-xs text-slate-500 font-medium">
          Resultados del archivo: <span className="font-bold text-slate-700">{nombre_archivo}</span>
        </p>
        <button onClick={resetear} className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Analizar otro plano
        </button>
      </div>

      {/* BLOQUES ANALÍTICOS DINÁMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Referencias Detectadas</span>
          <div className="text-2xl font-black text-slate-800 tracking-tight">{metricas.total_referencias}</div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipos Identificados</span>
          <div className="text-2xl font-black text-slate-800 tracking-tight">{metricas.tipos_identificados}</div>
        </div>

        <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-sm ring-1 ring-teal-500/5">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest block mb-2">Volumen de Hormigón</span>
          <div className="text-2xl font-black text-teal-600 tracking-tight">{metricas.volumen_hormigon_total}</div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 text-emerald-600">Precisión Promedio IA</span>
          <div className="text-2xl font-black text-slate-800 tracking-tight">{metricas.precision_algoritmo}</div>
        </div>
      </div>

      {/* SECCIÓN DETALLE DE CANTIDADES DINÁMICA */}
      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Detalle de cantidades</span>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Fundaciones identificadas</h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button onClick={() => setVistaActiva('resumen')} className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${vistaActiva === 'resumen' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>RESUMEN</button>
              <button onClick={() => setVistaActiva('detalle')} className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${vistaActiva === 'detalle' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>VER DETALLE</button>
            </div>
            <button
              onClick={() => setVerPlanoCompleto((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b121f] hover:bg-slate-800 text-teal-300 transition-all text-xs font-bold shadow-sm"
            >
              <Eye className="h-3.5 w-3.5" /> Auditar Plano Completo
            </button>
          </div>
        </div>

        {/* GRILLA AUTOGENERADA POR ARRAY */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-8">Tipo</th>
                <th className="py-3.5 px-6">Cantidad</th>
                <th className="py-3.5 px-6">Dimensiones (X × Y × H)</th>
                <th className="py-3.5 px-6">Vol. Unitario</th>
                <th className="py-3.5 px-6">Vol. Total</th>
                <th className="py-3.5 px-8 text-right">Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {filas.map((fila, idx) => (
                <tr key={fila.id || idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-8 font-black text-slate-800 text-sm">{fila.tipo}</td>
                  <td className="py-4 px-6 text-slate-700">{fila.cantidad}</td>
                  <td className="py-4 px-6 font-mono text-slate-500 tracking-tight">{fila.dimensiones}</td>
                  <td className="py-4 px-6 font-mono text-slate-500">{fila.volUnitario}</td>
                  <td className="py-4 px-6 font-bold text-slate-800 text-sm">{fila.volTotal}</td>
                  <td className="py-4 px-8 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button 
                        onClick={() => setZapataAuditar(fila)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0b121f] hover:bg-slate-800 text-teal-300 transition-all text-[11px] font-bold"
                      >
                        <Box className="h-3 w-3" /> Auditar 3D
                      </button>
                      <button 
                        onClick={() => abrirCorreccion(fila)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-teal-600 transition-all text-[11px] font-bold"
                      >
                        <SlidersHorizontal className="h-3 w-3" /> Corregir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal flotante de calibración manual */}
      {filaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 z-50 max-w-md w-full animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Calibración Manual: Fundación {filaEditando.tipo}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Ajustá las dimensiones detectadas por la IA. El volumen se recalcula en caliente.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Ancho X (mts)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valoresForm.x}
                  onChange={(e) => setValoresForm((v) => ({ ...v, x: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Largo Y (mts)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valoresForm.y}
                  onChange={(e) => setValoresForm((v) => ({ ...v, y: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Espesor H (mts)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valoresForm.h}
                  onChange={(e) => setValoresForm((v) => ({ ...v, h: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setFilaEditando(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
