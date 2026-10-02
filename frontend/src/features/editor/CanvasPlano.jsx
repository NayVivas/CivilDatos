import { Maximize2, ZoomIn, ZoomOut, Move } from 'lucide-react';

export default function CanvasPlano({ herramienta }) {
  
  // Mensajes dinámicos según la herramienta que tengas activa a la izquierda
  const obtenerMensajeAyuda = () => {
    switch (herramienta) {
      case 'select': return 'Modo Inspección: Hacé clic sobre un muro detectado para ver su detalle.';
      case 'line': return 'Modo Trazado: Hacé clic sobre el plano para añadir o estirar un muro.';
      case 'point': return 'Modo Referencia: Hacé clic para marcar un punto de control estructural.';
      case 'eraser': return 'Modo Borrador: Seleccioná la línea generada por la IA que quieras remover.';
      default: return 'Cargando plano...';
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 select-none">
      
      {/* CONTROL DE ZOOM SUPERIOR FLOTANTE */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-800 p-1.5 rounded-xl shadow-xl flex items-center gap-1 z-20">
        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors" title="Acercar">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors" title="Alejar">
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-slate-800 mx-1"></div>
        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors" title="Mover lienzo">
          <Move className="h-4 w-4" />
        </button>
      </div>

      {/* RECUADRO INDICADOR DE ACCIÓN FLOTANTE */}
      <div className="absolute top-4 right-4 bg-slate-950/90 border border-slate-800/80 px-4 py-2 rounded-xl shadow-xl z-20">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Herramienta Activa</p>
        <p className="text-xs font-semibold text-teal-400 capitalize mt-0.5">{herramienta === 'select' ? 'Selección' : herramienta}</p>
      </div>

      {/* EL LIENZO TÉCNICO DE TRABAJO */}
      <div className="w-full max-w-4xl aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-800/60 shadow-2xl relative overflow-hidden flex items-center justify-center group
        /* Cuadrícula técnica estilo CAD hecha con CSS puro de Tailwind */
        bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px]">
        
        {/* SIMULACIÓN DE PLANO CARGADO (Fondo opaco y técnico) */}
        <div className="w-[85%] h-[85%] border border-slate-700/40 bg-slate-900/40 rounded-lg flex flex-col items-center justify-center p-4 relative backdrop-blur-sm">
          
          {/* Gráfico Vectorial que simula líneas arquitectónicas */}
          <svg className="absolute inset-0 w-full h-full text-slate-800/50 p-6" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect x="10" y="10" width="80" height="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="10" y1="40" x2="90" y2="40" stroke="currentColor" strokeWidth="0.5" />
            <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
            {/* Muro simulado en color cian suave */}
            <line x1="15" y1="25" x2="75" y2="25" stroke="#14b8a6" strokeWidth="1.5" className="animate-pulse" />
            <line x1="75" y1="25" x2="75" y2="65" stroke="#14b8a6" strokeWidth="1.5" className="animate-pulse" />
          </svg>

          {/* Cartelito flotante en el centro del plano */}
          <div className="z-10 bg-slate-950/80 border border-slate-800 px-4 py-3 rounded-xl max-w-xs text-center shadow-2xl backdrop-blur">
            <Maximize2 className="h-5 w-5 text-teal-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-300">Vista del Plano Estructural</p>
            <p className="text-[10px] text-slate-500 mt-1">El algoritmo está proyectando las cotas calculadas por encima del lienzo.</p>
          </div>

        </div>

      </div>

      {/* BARRA INFERIOR DE AYUDA CONTEXTUAL */}
      <footer className="w-full max-w-4xl mt-4 bg-slate-900/40 border border-slate-850 px-4 py-2.5 rounded-xl text-center shadow-lg backdrop-blur">
        <p className="text-xs text-slate-400 font-medium">
          💡 <span className="text-slate-300 font-semibold">{obtenerMensajeAyuda()}</span>
        </p>
      </footer>

    </div>
  );
}
