import { useState, useRef } from 'react';
import { UploadCloud, FileText, Construction, AlertCircle } from 'lucide-react';

export default function DragAndDrop({ onExito }) {
  const [arrastrando, setArrastrando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const inputRef = useRef(null);

  // Controladores de eventos de arrastre
  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = () => {
    setArrastrando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validarYSetearArchivo(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validarYSetearArchivo(e.target.files[0]);
    }
  };

  const validarYSetearArchivo = (file) => {
    // Validamos que sea imagen o PDF
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      setArchivo(file);
    } else {
      alert("Por favor, subí un formato válido: Plano en formato Imagen (PNG, JPG) o PDF.");
    }
  };

  const iniciarProcesamiento = () => {
    if (!archivo) return;
    setProcesando(true);

    // Simulamos el tiempo que tarda la IA/OpenCV de tu compañera en procesar el plano (3 segundos)
    setTimeout(() => {
      setProcesando(false);
      onExito(); // Dispara el cambio de pantalla en App.jsx con las métricas simuladas
    }, 3000);
  };

  return (
    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      
      {/* Encabezado del cargador */}
      <div className="flex items-center gap-4 mb-6 border-b border-slate-850 pb-4">
        <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
          <Construction className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Carga del Plano de Obra</h2>
          <p className="text-xs text-slate-400">Subí el plano arquitectónico para calcular métricas mediante visión por computadora.</p>
        </div>
      </div>

      {/* Zona de arrastre interactiva */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
          arrastrando 
            ? 'border-teal-400 bg-teal-500/5 scale-[1.01]' 
            : 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950'
        }`}
      >
        <input 
          type="file" 
          ref={inputRef} 
          onChange={handleInputChange} 
          accept="image/*,.pdf" 
          className="hidden" 
        />

        {!archivo ? (
          <>
            <UploadCloud className={`h-12 w-12 mb-4 transition-colors ${arrastrando ? 'text-teal-400' : 'text-slate-500'}`} />
            <p className="text-sm text-slate-300 font-medium mb-1">
              Arrastrá tu plano aquí o <span className="text-teal-400 hover:underline">buscá en tu equipo</span>
            </p>
            <p className="text-xs text-slate-500">Formatos soportados: PNG, JPG, JPEG o PDF estructural</p>
          </>
        ) : (
          <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl w-full max-w-md shadow-lg">
            <FileText className="h-10 w-10 text-teal-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{archivo.name}</p>
              <p className="text-xs text-slate-500">{(archivo.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setArchivo(null); }}
              className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 bg-slate-850 hover:bg-slate-800 rounded transition-colors"
            >
              Cambiar
            </button>
          </div>
        )}
      </div>

      {/* Alerta informativa sutil */}
      <div className="mt-4 flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-amber-300/80 text-xs">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Asegurá que la escala numérica del plano sea legible para optimizar el cálculo de márgenes y materiales del algoritmo de visión artificial.</span>
      </div>

      {/* Botón de acción principal */}
      {archivo && (
        <button
          onClick={iniciarProcesamiento}
          disabled={procesando}
          className={`w-full mt-6 py-3 px-4 rounded-xl font-semibold tracking-wide text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
            procesando 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-teal-500 text-slate-950 hover:bg-teal-400 active:scale-[0.99]'
          }`}
        >
          {procesando ? (
            <>
              <div className="h-4 w-4 border-2 border-slate-500 border-t-teal-400 rounded-full animate-spin"></div>
              Corriendo Algoritmos de Visión Artificial...
            </>
          ) : (
            'Analizar y Calcular Materiales de Obra'
          )}
        </button>
      )}

    </div>
  );
}
