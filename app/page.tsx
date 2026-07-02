"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-calendar/dist/Calendar.css";
import { generarChecklistPDF } from "@/lib/generarPDF";

// Cargamos el calendario de forma dinámica desactivando SSR para evitar errores de hidratación
const Calendar = dynamic(() => import("react-calendar"), {
  ssr: false,
});

export default function Home() {
  const [userName, setUserName] = useState("Felipe Rojo");
  const [userRole, setUserRole] = useState("Supervisor de Terreno");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [actividades, setActividades] = useState<any[]>([]);
  const [actividadesDia, setActividadesDia] = useState<any[]>([]);
  
  // Estado para controlar la apertura del Sidebar en celulares
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Estados para la gestión y control del modal de reporte de riesgo HSEC
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [actividadReporte, setActividadReporte] = useState("");
  const [riesgoReporte, setRiesgoReporte] = useState("");
  const [descripcionReporte, setDescripcionReporte] = useState("");
  const [lugarReporte, setLugarReporte] = useState("");

  useEffect(() => {
    cargarActividades();
  }, []);

  async function cargarActividades() {
    try {
      const response = await fetch("/api/actividades");
      const data = await response.json();
      
      const listaActividades = Array.isArray(data) ? data : (data.data || []);
      setActividades(listaActividades);
    } catch (error) {
      console.error("Error al cargar actividades:", error);
    }
  }

  // Filtrado de actividades por la fecha seleccionada (formato DD-MM-YYYY)
  useEffect(() => {
    if (!(selectedDate instanceof Date)) return;
    
    const dia = String(selectedDate.getDate()).padStart(2, "0");
    const mes = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const anio = selectedDate.getFullYear();
    const fechaFormatoSupabase = `${dia}-${mes}-${anio}`;
    
    const tareas = actividades.filter((a: any) => 
      a.fecha_programada === fechaFormatoSupabase
    );
    
    setActividadesDia(tareas);
  }, [selectedDate, actividades]);

  // Cambiar el título de la pestaña del navegador
  useEffect(() => {
    document.title = "Agente IA BHP";
  }, []);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const enviarMensajeChat = async (textoPregunta: string) => {
    if (!textoPregunta.trim()) return;

    const horaActual = new Date().toLocaleTimeString();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: textoPregunta,
        time: horaActual,
        tipo: "chat",
      },
    ]);

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textoPregunta,
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
          tipo: data.tipo ?? "chat",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Error al conectar con el servidor.",
          tipo: "chat",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const pregunta = input;
    setInput("");
    await enviarMensajeChat(pregunta);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0B132B] text-slate-100 font-sans overflow-hidden relative">
      
      {/* 1. SIDEBAR CORPORATIVO BHP */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-80 bg-[#1C2541] flex flex-col justify-between 
        border-r border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out shrink-0 overflow-y-auto
        ${sidebarAbierto ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6">
          <div className="mb-8 border-b border-slate-800 pb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-tighter text-[#FF5A00]">BHP</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">INTERNAL</span>
              </div>
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">
                Agente de Controles Críticos
              </p>
            </div>
            <button onClick={() => setSidebarAbierto(false)} className="md:hidden text-slate-400 hover:text-white text-xl p-1">✕</button>
          </div>

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
                    className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-[#FF5A00] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">Rol Operacional</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-[#FF5A00] transition-colors"
                  >
                    <option value="Supervisor de Terreno">Supervisor de Terreno</option>
                    <option value="Técnico HSEC">Técnico HSEC</option>
                    <option value="Gerente de Entrega de Proyectos">Gerente de Entrega de Proyectos</option>
                  </select>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold mb-3 text-slate-300">📅 Calendario</h3>
                  <div className="bg-white rounded-xl p-2 text-black shadow-md mx-auto max-w-full overflow-x-auto text-xs">
                    <Calendar
                      value={selectedDate}
                      onChange={(value: any) => {
                        setSelectedDate(value);
                        setSidebarAbierto(false);
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold mb-3 text-slate-300">📋 Actividades del día</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {actividadesDia.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No existen actividades para esta fecha.</p>
                    ) : (
                      actividadesDia.map((actividad: any, index: number) => (
                        <button
                          key={index}
                          className="w-full text-left bg-slate-800 hover:bg-orange-600 p-2 rounded-lg transition text-xs text-slate-200 line-clamp-2"
                          onClick={() => {
                            enviarMensajeChat(actividad.actividad);
                            setSidebarAbierto(false);
                          }}
                        >
                          {actividad.actividad}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setMostrarReporte(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-lg tracking-wide text-xs uppercase"
                  >
                    🚨 Reportar Riesgo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {sidebarAbierto && <div onClick={() => setSidebarAbierto(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" />}

      {/* 2. CONTENEDOR PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full bg-[#0B132B] min-w-0 w-full">
        <header className="bg-[#1C2541] border-b border-slate-800 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarAbierto(!sidebarAbierto)}
              className="md:hidden bg-[#0B132B] border border-slate-700 hover:border-[#FF5A00] p-2 rounded-xl text-slate-200 focus:outline-none"
            >
              ☰
            </button>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="text-base sm:text-xl">🛡️</span> Módulo Automatizado HSEC
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                Mitigación automatizada del factor humano en la asignación de riesgos.
              </p>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="max-w-xl text-center space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FF5A00]/10 text-[#FF5A00] rounded-2xl flex items-center justify-center mx-auto border border-[#FF5A00]/20 text-xl sm:text-2xl shadow-inner">
                  🤖
                </div>
                <h3 className="text-base sm:text-xl font-bold text-slate-200">Asistente Predictivo de Controles Críticos</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Ingresa las actividades planificadas para el mes o describe condiciones específicas en terreno o pincha el menú de arriba para cargar tareas del calendario.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`w-full sm:max-w-3xl rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-lg border text-xs sm:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#FF5A00] border-[#FF5A00] text-white rounded-br-none"
                    : "bg-[#1C2541] border-slate-800 text-slate-200 rounded-bl-none"
                }`}>
                  <div className="flex items-center justify-between mb-2 opacity-70 border-b border-slate-700/30 pb-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">
                      {m.role === "user" ? userName : "AGENTE INTELIGENTE BHP"}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono">{m.time}</span>
                  </div>
                  
                  {/* RESTAURADO: Muestra siempre texto fluido y limpio en la pantalla del chat */}
                  <div className="whitespace-pre-wrap font-sans">
                    {m.content}
                  </div>

                  {m.role === "assistant" && m.tipo === "evaluacion" && (
                    <div className="mt-3 pt-2 border-t border-slate-700/40 flex justify-end">
                      <button
                        onClick={() => {
                          const idx = messages.findIndex(msg => msg.id === m.id);
                          const userPrompt = idx > 0 ? messages[idx - 1].content : "Actividad General";
                          generarChecklistPDF(userPrompt, m.content, userName);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-white font-bold tracking-wide text-[10px] sm:text-xs uppercase flex items-center gap-2 transition shadow-md"
                      >
                        📄 Descargar Checklist PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#1C2541] border border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-md max-w-xs">
                <div className="flex space-x-1.5 items-center justify-center h-4">
                  <div className="w-1.5 h-1.5 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Input Industrial de Entrada */}
        <footer className="p-4 sm:p-6 bg-[#131A35] border-t border-slate-800 shadow-inner shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-5xl mx-auto">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Escriba aquí la actividad programada (ej: Desarme de andamios)..."
                className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl pl-4 pr-4 py-3 sm:py-4 text-xs sm:text-sm focus:outline-none focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-all placeholder:text-slate-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#FF5A00] hover:bg-[#E04F00] disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 font-bold py-3 sm:py-0 sm:px-8 rounded-xl text-xs sm:text-sm transition-all shadow-md tracking-wide uppercase flex items-center justify-center"
            >
              Evaluar Tarea
            </button>
          </form>
        </footer>
      </main>

      {/* Modal de Reporte de Riesgos */}
      {mostrarReporte && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl w-full max-w-[520px] p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base sm:text-xl font-bold mb-4 sm:mb-6 text-white flex items-center gap-2">
              🚨 Reportar Riesgo No Controlado
            </h2>

            <div className="space-y-3">
              <input
                className="w-full p-2.5 sm:p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Actividad"
                value={actividadReporte}
                onChange={(e) => setActividadReporte(e.target.value)}
              />

              <input
                className="w-full p-2.5 sm:p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Riesgo observado"
                value={riesgoReporte}
                onChange={(e) => setRiesgoReporte(e.target.value)}
              />

              <textarea
                className="w-full p-2.5 sm:p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-red-600 transition-colors resize-none"
                placeholder="Descripción detallada de la anomalía..."
                rows={3}
                value={descripcionReporte}
                onChange={(e) => setDescripcionReporte(e.target.value)}
              />

              <input
                className="w-full p-2.5 sm:p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Lugar / Sector Operacional"
                value={lugarReporte}
                onChange={(e) => setLugarReporte(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 mt-5 sm:mt-6">
              <button onClick={() => setMostrarReporte(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wide transition">
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert("Riesgo reportado correctamente al sistema HSEC.");
                  setActividadReporte("");
                  setRiesgoReporte("");
                  setDescripcionReporte("");
                  setLugarReporte("");
                  setMostrarReporte(false);
                }}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wide transition text-white shadow-md"
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}