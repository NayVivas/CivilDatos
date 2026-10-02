import { DollarSign, Maximize2, MoveRight, Layers, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function PanelMetricas({ metricas, resetear }) {
  // Formateador de moneda para que los números queden impecables
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor);
  };

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900/60 backdrop-blur flex flex-col h-full shrink-0 z-10">
      
      {/* Cabecera del Panel */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-teal-400" />
          <h3 className="font-semibold text-sm text-slate-200 tracking-wide uppercase">
            Métricas de Obra
          </h3>
        </div>
        <button 
          onClick={resetear}
          className="p-1.5 rounded-md bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all group"
          title="Cargar otro plano"
        >
          <RefreshCw className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
        </button>
      </div>

      {/* Contenedor de Tarjetas (Scrollable por si hay muchos materiales) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* TARJETA 1: COSTO ESTIMADO TOTAL */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden shadow-lg group hover:border-slate-700 transition-colors">
          <div className="absolute top-0 right-0 p-3 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <DollarSign className="h-16 w-16 -mr-4 -mt-4" />
          </div>
          <span className="text-xs font-medium text-slate-400 block mb-1">Presupuesto de Materiales</span>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatearMoneda(metricas.costoEstimado)}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
            Calculado en base a IA métrica <MoveRight className="h-2.5 w-2.5" /> Valor de mercado
          </p>
        </div>

        {/* TARJETAS SECUNDARIAS EN PARALELO */}
        <div className="grid grid-cols-2 gap-3">
          {/* Superficie */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium text-slate-400">Área Estimada</span>
              <Maximize2 className="h-3 w-3 text-teal-400" />
            </div>
            <div className="text-lg font-bold text-slate-200">{metricas.area} m²</div>
          </div>
          {/* Perímetro */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium text-slate-400">Perímetro</span>
              <Maximize2 className="h-3 w-3 text-teal-400 rotate-45" />
            </div>
            <div className="text-lg font-bold text-slate-200">{metricas.perimetro} m</div>
          </div>
        </div>

        {/* DESGLOSE DE MATERIALES DETALLADO */}
        <div className="space-y-2 pt-2">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            Lista de Materiales
          </h4>
          
          {metricas.materiales.length === 0 ? (
            <p className="text-xs text-slate-500 italic pl-1">No hay datos procesados.</p>
          ) : (
            metricas.materiales.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg flex items-center justify-between hover:bg-slate-950 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-slate-300 truncate">{item.nombre}</p>
                  <p className="text-[10px] text-slate-500">Cantidad: {item.cantidad}</p>
                </div>
                <div className="text-xs font-bold text-slate-200 shrink-0">
                  {formatearMoneda(item.costo)}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* PIE DEL PANEL: BOTÓN DE EXPORTACIÓN */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
        <button 
          onClick={() => alert('Exportando métricas optimizadas a planilla Excel / CSV')}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold tracking-wide border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          Exportar Cómputo Métrico
        </button>
      </div>

    </aside>
  );
}
