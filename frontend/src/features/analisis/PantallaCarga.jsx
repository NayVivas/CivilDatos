import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, FileClock } from 'lucide-react';
import { serviciosAPI } from '../../services/api';

export default function PantallaCarga({ archivo, onExito, onCancelar }) {
  const [progreso, setProgreso] = useState(0);
  const [estadoActual, setEstadoActual] = useState('Iniciando carga de documentación...');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!archivo) return;

    const subirYAnalizar = async () => {
      try {
        setEstadoActual('Subiendo plano al servidor...');
        
        // Llamamos al servicio real pasándole el archivo binario
        const resultado = await serviciosAPI.enviarPlanoAAvalisis(archivo);
        
        setProgreso(100);
        setEstadoActual('Análisis estructural finalizado.');
        
        // Le pasamos los datos puros recibidos de Python al App.jsx
        setTimeout(() => {
          onExito(resultado);
        }, 800);

      } catch (err) {
        setError('Ocurrió un error al procesar el plano. Asegúrate de que el backend esté encendido.');
        console.error(err);
      }
    };

    subirYAnalizar();

    // Simulación visual de avance de subtareas mientras procesa la red
    const intervaloVisual = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 90) {
          clearInterval(intervaloVisual);
          return 90; // Se clava en 90% hasta que la API responda el 100% real
        }
        if (prev === 25) setEstadoActual('Reconociendo referencias estructurales...');
        if (prev === 60) setEstadoActual('Asociando dimensiones y escalas...');
        if (prev === 80) setEstadoActual('Calculando volúmenes de hormigón...');
        return prev + 1;
      });
    }, 150);

    return () => clearInterval(intervaloVisual);
  }, [archivo, onExito]);

  const radio = 80;
  const circunferencia = 2 * Math.PI * radio;
  const strokeDashoffset = circunferencia - (progreso / 100) * circunferencia;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center p-12 bg-white rounded-3xl border border-red-100 shadow-sm space-y-4">
        <p className="text-red-600 font-bold text-sm">{error}</p>
        <button onClick={onCancelar} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold">
          Volver a intentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <button onClick={onCancelar} className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Cancelar análisis
      </button>

      <div className="bg-white border border-slate-200/60 rounded-3xl p-12 shadow-sm flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative flex items-center justify-center mb-8">
          <svg className="w-44 h-44 transform -rotate-90">
            <circle cx="88" cy="88" r={radio} className="stroke-slate-100" strokeWidth="10" fill="transparent" />
            <circle cx="88" cy="88" r={radio} className="stroke-teal-500 transition-all duration-100" strokeWidth="10" fill="transparent" strokeDasharray={circunferencia} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </svg>
          <div className="absolute text-center">
            <span className="text-4xl font-black text-slate-800 tracking-tight">{progreso}%</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">IA Métrica</p>
          </div>
        </div>

        <div className="text-center max-w-lg mb-4">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Procesando plano en tiempo real</h2>
          <p className="text-xs text-teal-600 font-bold uppercase tracking-wider">{estadoActual}</p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mt-6 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
          <Loader2 className="h-3.5 w-3.5 text-teal-500 animate-spin" />
          Comunicando con servidor Python...
        </div>
      </div>
    </div>
  );
}
