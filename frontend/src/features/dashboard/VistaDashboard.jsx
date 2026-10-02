import { useRef, useEffect, useState } from 'react';
import { Plus, ArrowUpRight, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function VistaDashboard({ onArchivoSeleccionado }) {
  const fileInputRef = useRef(null);
  const [actividadReal, setActividadReal] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  // Estados dinámicos para los totalizadores superiores (KPIs)
  const [kpis, setKpis] = useState({
    proyectos: 0,
    planos: 0,
    hormigon: 0
  });

  // Efecto que consulta el historial real al cargar el Dashboard
  useEffect(() => {
    const traerHistorial = async () => {
      try {
        const respuesta = await axios.get('http://localhost:8000/api/v1/proyectos/historial');
        const proyectos = respuesta.data;
        
        setActividadReal(proyectos);

        // Sumatoria del total de planos (cada reporte cuenta como 1 plano procesado)
        const totalPlanos = proyectos.length;

        // Sumatoria exacta del volumen de hormigón limpiando el texto "m³"
        // Sumatoria exacta del volumen de hormigón limpiando cualquier texto (m³, m3, espacios)
const totalHormigon = proyectos.reduce((acc, p) => {
  const valorTexto = p.metricas_globales?.volumen_hormigon_total || "0";
  // Extrae solo los dígitos y el punto decimal (ej: "194.71975 m³" -> "194.71975")
  const coincidencia = valorTexto.match(/[\d.]+/);
  const numeroLimpio = coincidencia ? parseFloat(coincidencia[0]) : 0;
  return acc + numeroLimpio;
}, 0);


        setKpis({
          proyectos: proyectos.length > 0 ? 1 : 0, // Se asume 1 proyecto global activo si hay planos
          planos: totalPlanos,
          hormigon: totalHormigon.toFixed(3)
        });

      } catch {
        // Sin historial disponible se muestra el estado vacío.
      } finally {
        setCargandoHistorial(false);
      }
    };

    traerHistorial();
  }, []);

  const handleFileChange = (e) => {
    const archivos = e.target.files;
    if (archivos && archivos.length > 0) {
      onArchivoSeleccionado(archivos[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fadeIn">
      {/* Selector de archivos nativo oculto */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="application/pdf" 
        className="hidden" 
      />

      {/* BANNER PRINCIPAL */}
      <div className="bg-[#0b121f] rounded-3xl p-8 relative overflow-hidden shadow-xl border border-slate-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(20,184,166,0.08),transparent_50%)] pointer-events-none" />
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span> Centro de análisis estructural
          </div>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">Buenos días.</h2>
          <p className="text-sm text-slate-400 leading-relaxed">Gestioná tus proyectos, procesá planos y convertí documentación técnica en cómputos confiables.</p>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="shrink-0 z-10 px-5 py-3 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl text-sm tracking-wide shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2 group active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[3px]" /> Nuevo análisis
        </button>
      </div>

      {/* GRILLA DE BLOQUES METRICOS TOTALIZADORES (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proyectos Activos</span>
          <div className="text-3xl font-black text-slate-800 tracking-tight mt-4">{kpis.proyectos}</div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Planos Procesados</span>
          <div className="text-3xl font-black text-slate-800 tracking-tight mt-4">{kpis.planos}</div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Precisión Global IA</span>
          <div className="text-3xl font-black text-slate-800 tracking-tight mt-4">94.2%</div>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hormigón Calculado</span>
          <div className="text-3xl font-black text-teal-600 tracking-tight mt-4">{kpis.hormigon} m³</div>
        </div>
      </div>

      {/* SECCIÓN DE HISTORIAL DE REPORTES REALES */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Actividad reciente</h3>
            <p className="text-xs text-slate-400 mt-0.5">Reportes almacenados y computados por el motor de Python</p>
          </div>
          <button className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-0.5">
            Ver todos <ArrowUpRight className="h-3 w-3 stroke-[2.5px]" />
          </button>
        </div>

        {cargandoHistorial ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
            <p className="text-xs font-semibold">Consultando base de datos analítica...</p>
          </div>
        ) : actividadReal.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            No hay análisis previos en el historial. ¡Subí tu primer plano estructural para comenzar!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Proyecto / Archivo</th>
                  <th className="py-3 px-4">Zapatas Detectadas</th>
                  <th className="py-3 px-4">Vol. Hormigón</th>
                  <th className="py-3 px-4">Estado Analítico</th>
                  <th className="py-3 px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {actividadReal.map((fila, idx) => (
                  <tr key={fila.proyecto_id || fila.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    {/* Celda Nombre Archivo */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="h-9 w-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 truncate">{fila.nombre_archivo || 'Plano Estructural'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">ID del Job: {(fila.proyecto_id || fila.id || 'N/A').substring(0, 8)}...</p>
                      </div>
                    </td>

                    {/* Celda Cantidades */}
                    <td className="py-4 px-4 font-semibold text-slate-600">
                      {fila.metricas_globales?.total_referencias ?? 0} unidades
                    </td>

                    {/* Celda Volumen */}
                    <td className="py-4 px-4 font-bold text-slate-700">
                      {fila.metricas_globales?.volumen_hormigon_total || '0.000 m³'}
                    </td>

                    {/* Celda Estados e Alertas */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        fila.alertas_ingenieria && fila.alertas_ingenieria.length > 0
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${fila.alertas_ingenieria && fila.alertas_ingenieria.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                        {fila.alertas_ingenieria && fila.alertas_ingenieria.length > 0 ? 'Procesado c/Alertas' : 'Procesado Limpio'}
                      </span>
                    </td>

                    {/* Celda Acción */}
                    <td className="py-4 px-6 text-right">
                      <button className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors">
                        Auditar Cómputo →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
