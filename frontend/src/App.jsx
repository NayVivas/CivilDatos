import { useState } from 'react';
import HerramientasDibujo from './features/editor/HerramientasDibujo';
import CanvasPlano from './features/editor/CanvasPlano';
import PanelMetricas from './features/editor/PanelMetricas';
import DragAndDrop from './features/cargador/DragAndDrop';

export default function App() {
  // Estado global para saber si ya se cargó un plano o no
  const [planoCargado, setPlanoCargado] = useState(false);
  const [herramientaActiva, setHerramientaActiva] = useState('select');

  // Simulación de métricas que llegarán desde el Python de tu compañera
  const [metricas, setMetricas] = useState({
    perimetro: 0,
    area: 0,
    costoEstimado: 0,
    materiales: []
  });

  // Función simulada cuando subas el archivo con éxito
  const handlePlanoProcesado = (datosSimulados) => {
    setMetricas({
      perimetro: 45.2,
      area: 120.5,
      costoEstimado: 2580.00,
      materiales: [
        { nombre: 'Hormigón / Cemento', cantidad: '15.5 m³', costo: 1250 },
        { nombre: 'Barras de Acero (Hierro)', cantidad: '420 kg', costo: 880 },
        { nombre: 'Ladrillos Portantes', cantidad: '1,200 ud', costo: 450 }
      ]
    });
    setPlanoCargado(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* HEADER / BARRA SUPERIOR */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-sm">
            C
          </div>
          <span className="font-semibold text-sm tracking-wider uppercase text-slate-200">
            CivilDatos <span className="text-teal-400 text-xs lowercase font-normal">v1.0</span>
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
          Status: {planoCargado ? '🟢 Plano Analizado con Éxito' : '⚪ Esperando Archivo'}
        </div>
      </header>

      {/* CUERPO PRINCIPAL DE LA APLICACIÓN */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Vista 1: Si no hay plano cargado, mostramos el cargador gigante */}
        {!planoCargado ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-slate-950/40">
            <DragAndDrop onExito={handlePlanoProcesado} />
          </div>
        ) : (
          /* Vista 2: Interfaz del editor profesional */
          <>
            {/* Barra de herramientas izquierda */}
            <HerramientasDibujo 
              activa={herramientaActiva} 
              setActiva={setHerramientaActiva} 
            />

            {/* Canvas central */}
            <main className="flex-1 bg-slate-900/20 relative overflow-hidden flex items-center justify-center">
              <CanvasPlano herramienta={herramientaActiva} />
            </main>

            {/* Panel de costos y métricas derecho */}
            <PanelMetricas metricas={metricas} resetear={() => setPlanoCargado(false)} />
          </>
        )}
        
      </div>
    </div>
  );
}
