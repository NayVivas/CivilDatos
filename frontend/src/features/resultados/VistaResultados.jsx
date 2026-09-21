import { useState } from 'react';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';

export default function VistaResultados({ datos, resetear }) {
  const [vistaActiva, setVistaActiva] = useState('resumen');

  // Si por alguna razón no hay datos cargados, muestra un estado vacío preventivo
  if (!datos) return <p className="text-center p-12 text-slate-400">Esperando datos de origen...</p>;

  const { metricas_globales, tabla_fundaciones, nombre_archivo } = datos;

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
          <div className="text-2xl font-black text-slate-800 tracking-tight">{metricas_globales.total_referencias}</div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipos Identificados</span>
          <div className="text-2xl font-black text-slate-800 tracking-tight">{metricas_globales.tipos_identificados}</div>
        </div>

        <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-sm ring-1 ring-teal-500/5">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest block mb-2">Volumen de Hormigón</span>
          <div className="text-2xl font-black text-teal-600 tracking-tight">{metricas_globales.volumen_hormigon_total}</div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 text-emerald-600">Precisión Promedio IA</span>
          <div className="text-2xl font-black text-slate-800 tracking-tight">{metricas_globales.precision_algoritmo}</div>
        </div>
      </div>

      {/* SECCIÓN DETALLE DE CANTIDADES DINÁMICA */}
      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Detalle de cantidades</span>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Fundaciones identificadas</h3>
          </div>
          
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shrink-0">
            <button onClick={() => setVistaActiva('resumen')} className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${vistaActiva === 'resumen' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>RESUMEN</button>
            <button onClick={() => setVistaActiva('detalle')} className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${vistaActiva === 'detalle' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>VER DETALLE</button>
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
              {tabla_fundaciones.map((fila, idx) => (
                <tr key={fila.id || idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-8 font-black text-slate-800 text-sm">{fila.tipo}</td>
                  <td className="py-4 px-6 text-slate-700">{fila.cantidad}</td>
                  <td className="py-4 px-6 font-mono text-slate-500 tracking-tight">{fila.dimensiones}</td>
                  <td className="py-4 px-6 font-mono text-slate-500">{fila.volUnitario}</td>
                  <td className="py-4 px-6 font-bold text-slate-800 text-sm">{fila.volTotal}</td>
                  <td className="py-4 px-8 text-right">
                    <button 
                      onClick={() => alert(`Enviando orden de recalculo para el tipo: ${fila.tipo}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-teal-600 transition-all text-[11px] font-bold"
                    >
                      <SlidersHorizontal className="h-3 w-3" /> Corregir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
