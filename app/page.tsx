'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [userName, setUserName] = useState('Felipe Rojo');
  const [userRole, setUserRole] = useState('Supervisor de Terreno');


const [totalRiesgos, setTotalRiesgos] = useState(0);
  // 1. Cambiar de forma estricta el título de la pestaña del navegador
  useEffect(() => {
    document.title = "Agente IA BHP";
  }, []);

  // 2. Control dinámico de contadores directo desde la base de datos cargada

  const [messages, setMessages] = useState<any[]>([]);
const [input, setInput] = useState("");
const [isLoading, setIsLoading] = useState(false);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setInput(e.target.value);
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!input.trim()) return;

  const pregunta = input;

  setMessages((prev) => [
    ...prev,
    {
      id: Date.now(),
      role: "user",
      content: pregunta,
    },
  ]);

  setInput("");
  setIsLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
    message: pregunta,
    userName,
    userRole,
}),
    });

    const data = await response.json();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        role: "assistant",
        content: data.respuesta ?? data.error,
      },
    ]);
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        role: "assistant",
        content: "Error al conectar con el servidor.",
      },
    ]);
  }

  setIsLoading(false);
};


  return (
    <div className="flex h-screen bg-[#0B132B] text-slate-100 font-sans overflow-hidden">
      
      {/* 1. SIDEBAR CORPORATIVO BHP (Panel Industrial) */}
      <aside className="w-80 bg-[#1C2541] flex flex-col justify-between border-r border-slate-800 shadow-2xl z-10">
        <div className="p-6">
          {/* Logo Brand BHP */}
          <div className="mb-8 border-b border-slate-800 pb-5">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tighter text-[#FF5A00]">BHP</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">INTERNAL</span>
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">Agente de Controles Críticos</p>
          </div>

          {/* Filtros Operacionales */}
          <div className="space-y-5">

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Operador en Sesión</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#FF5A00] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">Rol Operacional</label>
                  <select 
                    value={userRole} 
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#FF5A00] transition-colors"
                  >
                    <option value="Supervisor de Terreno">Supervisor de Terreno</option>
                    <option value="Técnico HSEC">Técnico HSEC</option>
                    <option value="Gerente de Entrega de Proyectos">Gerente de Entrega de Proyectos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="p-6 bg-[#131A35] border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-slate-300">Monitoreo Activo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p>Aislamiento de datos activo por Rol.</p>
        </div>
      </aside>

      {/* 2. CONTENEDOR PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full bg-[#0B132B]">
        
        {/* Top Header */}
        <header className="bg-[#1C2541] border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-md">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-xl">🛡️</span> Módulo Automatizado HSEC
            </h2>
            <p className="text-xs text-slate-400">Mitigación automatizada del factor humano en la asignación de riesgos.</p>
          </div>
        </header>

        {/* Ventana de Interacción con el Agente */}
        <section className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-xl text-center space-y-4">
                <div className="w-16 h-16 bg-[#FF5A00]/10 text-[#FF5A00] rounded-2xl flex items-center justify-center mx-auto border border-[#FF5A00]/20 text-2xl shadow-inner">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-slate-200">Asistente Predictivo de Controles Críticos</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ingresa las actividades planificadas para el mes o describe condiciones específicas en terreno (ej: *Trabajos en altura al aire libre en sector Filtro con ráfagas de viento*). El agente cruzará la data histórica y dictaminará los controles materiales de inmediato.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-2xl px-6 py-4 shadow-lg border text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-[#FF5A00] border-[#FF5A00] text-white rounded-br-none' 
                    : 'bg-[#1C2541] border-slate-800 text-slate-200 rounded-bl-none'
                }`}>
                  <div className="flex items-center justify-between mb-2 opacity-70 border-b border-slate-700/30 pb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest">
                      {m.role === 'user' ? userName : 'AGENTE INTELIGENTE BHP'}
                    </span>
                    <span className="text-[9px] font-mono">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans selection:bg-amber-500">{m.content}</div>
                </div>
              </div>
            ))
          )}

          {/* Estado de Carga / IA Pensando */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#1C2541] border border-slate-800 rounded-2xl rounded-bl-none px-6 py-4 shadow-md max-w-xs">
                <div className="flex space-x-2 items-center justify-center h-4">
                  <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Input Industrial de Entrada */}
        <footer className="p-6 bg-[#131A35] border-t border-slate-800 shadow-inner">
          <form onSubmit={handleSubmit} className="flex space-x-4 max-w-5xl mx-auto">
            <div className="flex-1 relative">
              <input
                value={input || ''}
                onChange={handleInputChange}
                placeholder="Escriba aquí la actividad operacional programada (ej: Desarme de andamios en sector Filtro)..."
                className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl pl-5 pr-4 py-4 text-sm focus:outline-none focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-all placeholder:text-slate-500 shadow-inner"
              />
            </div>
            <button 
  type="submit"
  disabled={isLoading || !input || !input.trim()}
  className="bg-[#FF5A00] hover:bg-[#E04F00] disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 font-bold px-8 rounded-xl text-sm transition-all shadow-md tracking-wide uppercase flex items-center"
>
  Evaluar Tarea
</button>
          </form>
        </footer>
      </main>
    </div>
  );
}