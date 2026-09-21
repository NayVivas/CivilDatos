import { useState } from 'react';
import SidebarLateral from './components/SidebarLateral';
import VistaDashboard from './features/dashboard/VistaDashboard';
import PantallaCarga from './features/analisis/PantallaCarga';
import VistaResultados from './features/resultados/VistaResultados';

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState('dashboard');
  
  // Guardará el archivo binario seleccionado para enviarlo luego
  const [archivoPlano, setArchivoPlano] = useState(null);
  
  // Guardará el JSON real que devuelva el backend de Python
  const [datosAnalisis, setDatosAnalisis] = useState(null);

  // Se ejecuta al seleccionar un archivo en el Dashboard
  const handleIniciarAnalisis = (archivoSeleccionado) => {
    setArchivoPlano(archivoSeleccionado);
    setSeccionActiva('analisis');
  };

  // Se ejecuta cuando PantallaCarga termina de recibir los datos de la API
  const handleAnalisisFinalizado = (datosBackend) => {
    setDatosAnalisis(datosBackend);
    setSeccionActiva('resultados');
  };

  const resetearFlujo = () => {
    setArchivoPlano(null);
    setDatosAnalisis(null);
    setSeccionActiva('dashboard');
  };

  const renderContenidoCentral = () => {
    switch (seccionActiva) {
      case 'dashboard':
        return <VistaDashboard onArchivoSeleccionado={handleIniciarAnalisis} />;
      case 'analisis':
        return <PantallaCarga archivo={archivoPlano} onExito={handleAnalisisFinalizado} onCancelar={resetearFlujo} />;
      case 'resultados':
        return <VistaResultados datos={datosAnalisis} resetear={resetearFlujo} />;
      default:
        return <VistaDashboard onArchivoSeleccionado={handleIniciarAnalisis} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] text-slate-900 font-sans overflow-hidden">
      <SidebarLateral activa={seccionActiva} setActiva={setSeccionActiva} />
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {renderContenidoCentral()}
      </main>
    </div>
  );
}
