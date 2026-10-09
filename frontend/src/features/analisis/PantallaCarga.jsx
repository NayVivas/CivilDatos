import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import axios from 'axios';

export default function PantallaCarga({ archivo, onExito, onCancelar }) {
  const [progreso, setProgreso] = useState(0);
  const [estadoActual, setEstadoActual] = useState('Iniciando carga de documentación...');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!archivo) return;

    const subirYAnalizar = async () => {
      try {
        setEstadoActual('Subiendo plano al servidor...');
        
        // 🟢 EXTRACCIÓN DEL BINARIO PURO
        let archivoFinal = archivo;
        
        // Si el archivo viene dentro de un FileList, agarramos el primero
        if (archivo instanceof FileList && archivo.length > 0) {
          archivoFinal = archivo[0];
        } else if (archivo.files && archivo.files.length > 0) {
          archivoFinal = archivo.files[0];
        } else if (typeof archivo === 'object' && archivo.target?.files) {
          archivoFinal = archivo.target.files[0];
        }

        if (!archivoFinal || !(archivoFinal instanceof File || archivoFinal instanceof Blob)) {
          throw new Error('El archivo seleccionado no es un binario válido.');
        }

        const formData = new FormData();
        // Inyectamos el binario puro bajo la clave 'file' que espera FastAPI
        formData.append('file', archivoFinal, archivoFinal.name);

        // Sin 'Content-Type' manual: Axios genera el boundary automáticamente.
        // Hacemos la petición real directa al puerto de FastAPI
        const respuesta = await axios.post('http://localhost:8001/api/v1/analizar-plano', formData);

        setProgreso(100);
        setEstadoActual('Análisis estructural finalizado con éxito.');
        
        setTimeout(() => {
          onExito(respuesta.data);
        }, 800);

      } catch (err) {
        if (err.response && err.response.status === 400) {
          setError(err.response.data.detail);
        } else {
          setError('Ocurrió un error en el procesador estructural. Asegúrate de que el backend de Python esté corriendo en el puerto 8001.');
        }
      }
    };

    subirYAnalizar();

    const intervaloVisual = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 90) {
          clearInterval(intervaloVisual);
          return 90;
        }
        if (prev === 25) setEstadoActual('Reconociendo referencias estructurales (Zapatas)...');
        if (prev === 60) setEstadoActual('Asociando dimensiones y escalas espaciales...');
        if (prev === 80) setEstadoActual('Calculando volúmenes de hormigón y armaduras...');
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(intervaloVisual);
  }, [archivo, onExito]);

  const radio = 80;
  const circunferencia = 2 * Math.PI * radio;
  const strokeDashoffset = circunferencia - (progreso / 100) * circunferencia;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center p-12 bg-white rounded-3xl border border-red-100 shadow-sm space-y-4">
        <p className="text-red-600 font-bold text-sm">{error}</p>
        <button onClick={onCancelar} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors">
          Volver al Dashboard
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

        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Procesando plano en tiempo real</h2>
          <p className="text-xs text-teal-600 font-bold uppercase tracking-wider animate-pulse">{estadoActual}</p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mt-8 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
          <Loader2 className="h-3.5 w-3.5 text-teal-500 animate-spin" />
          Comunicando con servidor Python en puerto 8001...
        </div>
      </div>
    </div>
  );
}
