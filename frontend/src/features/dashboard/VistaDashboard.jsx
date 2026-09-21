import { useRef } from 'react';
import { Plus, ArrowUpRight, FileText, BarChart3, Layers } from 'lucide-react';

export default function VistaDashboard({ onArchivoSeleccionado }) {
  // Referencia para activar el input de archivos oculto
  const fileInputRef = useRef(null);

  // Datos globales históricos del Dashboard
  const tarjetasMetricas = [
    { id: 1, titulo: 'Proyectos Activos', valor: '12', cambio: '+3 este mes', colorCambio: 'text-emerald-500', icono: FileText },
    { id: 2, titulo: 'Planos Procesados', valor: '48', cambio: '+12 este mes', colorCambio: 'text-emerald-500', icono: Layers },
    { id: 3, titulo: 'Precisión Global IA', valor: '94.2%', cambio: '+2.4% vs. anterior', colorCambio: 'text-emerald-500', icono: BarChart3 },
    { id: 4, titulo: 'Hormigón Calculado', valor: '320 m³', cambio: '+48 m³ este mes', colorCambio: 'text-emerald-500', icono: Layers },
  ];

  // Historial estático para simular la actividad del feed de base de datos
  const actividadReciente = [
    { id: 1, nombre: 'Edificio Norte', subtexto: 'Fundaciones · Hoy, 14:32', planos: 8, hormigon: '84.6 m³', estado: 'Procesado', colorEstado: 'bg-emerald-50/60 text-emerald-700 border-emerald-100' },
    { id: 2, nombre: 'Viviendas Sur', subtexto: 'Fundaciones · Hoy, 11:08', planos: 12, hormigon: '62.4 m³', estado: 'Revisar', colorEstado: 'bg-amber-50/60 text-amber-700 border-amber-100' },
  ];

  // Maneja la selección del archivo real
  const handleFileChange = (e) => {
    const archivos = e.target.files;
    if (archivos && archivos.length > 0) {
      const archivoSeleccionado = archivos[0];
      
      // Validamos formato básico antes de avanzar
      if (archivoSeleccionado.type.startsWith('image/') || archivoSeleccionado.type === 'application/pdf') {
        onArchivoSeleccionado(archivoSeleccionado);
      } else {
        alert("Formato no soportado. Por favor, subí un plano en imagen (PNG/JPG) o un archivo PDF técnico.");
      }
    }
  };

  const dispararSelectorArchivos = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fadeIn">
      
      {/* INPUT OCULTO DE CONTROL */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,application/pdf" 
        className="hidden" 
      />

      {/* 1. BANNER SUPERIOR */}
      <div className="bg-[#0b121f] rounded-3xl p-8 relative overflow-hidden shadow-xl border border-slate-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(20,184,166,0.08),transparent_50%)] pointer-events-none" />
        
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
            Centro de análisis estructural
          </div>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">
            Buenos días.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Gestioná tus proyectos, procesá planos y convertí documentación técnica en cómputos confiables.
          </p>
        </div>

        {/* BOTÓN CONECTADO AL SELECTOR */}
        <button 
          onClick={dispararSelectorArchivos}
          className="shrink-0 z-10 px-5 py-3 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl text-sm tracking-wide shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2 group active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[3px]" />
          Nuevo análisis
        </button>
      </div>

      {/* 2. TARJETAS ANALÍTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tarjetasMetricas.map((tarjeta) => {
          const Icono = tarjeta.icono;
          return (
            <div key={tarjeta.id} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tarjeta.titulo}</span>
                <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-teal-50 group-hover:text-teal-500 transition-colors">
                  <Icono className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-3xl font-black text-slate-800 tracking-tight">{tarjeta.valor}</div>
                <div className="text-[11px] font-semibold flex items-center gap-0.5 text-emerald-500">{tarjeta.cambio}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. TABLA DE ACTIVIDAD RECIENTE */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Actividad reciente</h3>
            <p className="text-xs text-slate-400 mt-0.5">Últimos proyectos y análisis procesados en el sistema</p>
          </div>
          <button className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-0.5">
            Ver todos <ArrowUpRight className="h-3 w-3 stroke-[2.5px]" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">Proyecto</th>
                <th className="py-3 px-4">Planos</th>
                <th className="py-3 px-4">Hormigón</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {actividadReciente.map((fila) => (
                <tr key={fila.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 flex items-center gap-3">
                    <div className="h-9 w-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-700 truncate">{fila.nombre}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{fila.subtexto}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-600">{fila.planos}</td>
                  <td className="py-4 px-4 font-bold text-slate-700">{fila.hormigon}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${fila.colorEstado}`}>
                      <span className={`h-1 w-1 rounded-full ${fila.estado === 'Procesado' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {fila.estado}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-xs font-bold text-slate-400 hover:text-teal-600 transition-colors">
                      Ver proyecto →
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
