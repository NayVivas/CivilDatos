import { MousePointer, Edit3, MapPin, Trash2, HelpCircle } from 'lucide-react';

export default function HerramientasDibujo({ activa, setActiva }) {
  
  // Definición de los botones de la barra de herramientas
  const herramientas = [
    { id: 'select', icono: MousePointer, etiqueta: 'Seleccionar (V)', tooltip: 'Mover y editar elementos existentes' },
    { id: 'line', icono: Edit3, etiqueta: 'Trazar Muro (L)', tooltip: 'Dibujar líneas de cálculo de materiales' },
    { id: 'point', icono: MapPin, etiqueta: 'Punto Métrico (P)', tooltip: 'Agregar nodo de referencia manual' },
    { id: 'eraser', icono: Trash2, etiqueta: 'Borrar (E)', tooltip: 'Eliminar trazos del algoritmo' },
  ];

  return (
    <aside className="w-16 border-r border-slate-800 bg-slate-900/60 backdrop-blur flex flex-col items-center py-4 justify-between h-full shrink-0 z-10">
      
      {/* Grupo Superior: Herramientas de edición CAD */}
      <div className="flex flex-col gap-3 w-full px-2">
        {herramientas.map((item) => {
          const Icono = item.icono;
          const estaActivo = activa === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiva(item.id)}
              className={`w-full aspect-square rounded-xl flex items-center justify-center relative transition-all group border ${
                estaActivo
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-lg shadow-teal-500/10 scale-[1.03]'
                  : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900'
              }`}
              title={item.etiqueta}
            >
              <Icono className="h-5 w-5" />
              
              {/* Tooltip flotante al pasar el mouse por encima */}
              <div className="absolute left-full ml-3 px-2 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-[11px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                <p className="font-semibold">{item.etiqueta}</p>
                <p className="text-slate-400 font-normal text-[10px]">{item.tooltip}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Grupo Inferior: Soporte / Ayuda técnica */}
      <div className="w-full px-2">
        <button 
          onClick={() => alert('Manual de uso: Seleccioná "Trazar Muro" y hacé clic en el lienzo para ajustar las cotas del plano.')}
          className="w-full aspect-square rounded-xl bg-slate-950/20 text-slate-500 border border-transparent hover:text-slate-300 hover:bg-slate-900 hover:border-slate-800 flex items-center justify-center transition-all group relative"
        >
          <HelpCircle className="h-5 w-5" />
          <div className="absolute left-full ml-3 px-2 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-[11px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
            Manual de Atajos
          </div>
        </button>
      </div>

    </aside>
  );
}
