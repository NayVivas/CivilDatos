import { LayoutDashboard, FolderKanban, Cpu, BarChart3, ClipboardList, LogOut } from 'lucide-react';

export default function SidebarLateral({ activa, setActiva }) {
  // CORREGIDO: Todo el menú usando "ClipboardList" de forma consistente
  const menú = [
    { id: 'dashboard', texto: 'Dashboard', icono: LayoutDashboard },
    { id: 'proyectos', texto: 'Proyectos', icono: FolderKanban },
    { id: 'analisis', texto: 'Análisis', icono: Cpu },
    { id: 'resultados', texto: 'Resultados', icono: BarChart3 },
    { id: 'reportes', texto: 'Reportes', icono: ClipboardList }, 
  ];

  return (
    <div className="w-64 bg-[#0b0f19] text-slate-400 flex flex-col justify-between h-full border-r border-slate-800 shrink-0 select-none">
      
      <div>
        {/* LOGO SUPERIOR */}
        <div className="p-6 border-b border-slate-850 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center font-black text-slate-950 text-sm">
            CE
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm tracking-tight leading-none">CómputoEstIA</h1>
            <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Ingeniería + IA</span>
          </div>
        </div>

        {/* ITEMS DE MENÚ */}
        <nav className="p-4 space-y-1">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Principal</p>
          {menú.map((item) => {
            const Icono = item.icono;
            const estaActivo = activa === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiva(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  estaActivo 
                    ? 'bg-[#161b26] text-teal-400 shadow-inner' 
                    : 'hover:bg-[#111622] hover:text-slate-200'
                }`}
              >
                <Icono className={`h-4 w-4 ${estaActivo ? 'text-teal-400' : 'text-slate-500'}`} />
                {item.texto}
              </button>
            );
          })}
        </nav>
      </div>

      {/* PIE DEL MENÚ */}
      <div className="p-4 border-t border-slate-850 bg-[#070a12]">
        <div className="bg-[#111622] border border-slate-800 p-3 rounded-xl mb-3 text-[10px]">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping"></span>
            SISTEMA OPERATIVO
          </div>
          <p className="text-slate-500">Entorno de deostracion • v0.1</p>
        </div>
        <button className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-rose-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <LogOut className="h-3 w-3" />
          Cerrar sesión
        </button>
      </div>

    </div>
  );
}
