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
  
  // Estados para la gestión y control del modal de reporte de riesgo HSEC
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [actividadReporte, setActividadReporte] = useState("");
  const [riesgoReporte, setRiesgoReporte] = useState("");
  const [descripcionReporte, setDescripcionReporte] = useState("");
  const [lugarReporte, setLugarReporte] = useState("");

  // Estado para controlar qué items han sido chequeados en terreno
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    cargarActividades();
  }, []);

  async function cargarActividades() {
    try {
      const response = await fetch("/api/actividades");
      const data = await response.json();
      
      // Si la API viene envuelta en un objeto con propiedad data, la extraemos correctamente
      const listaActividades = Array.isArray(data) ? data : (data.data || []);
      setActividades(listaActividades);
    } catch (error) {
      console.error("Error al cargar actividades:", error);
    }
  }

  // CORRECCIÓN DE FORMATO: Mapeo exacto para calzar con strings tipo "DD-MM-YYYY" de Supabase
  useEffect(() => {
    if (!(selectedDate instanceof Date)) return;
    
    // Extraemos día, mes y año asegurando los dos dígitos (ej: "02-07-2026")
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

  // Función auxiliar para enviar mensajes al chat
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

  const toggleCheckItem = (itemKey: string) => {
    setCheckedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  // Renderiza el contenido transformándolo en tabla sólo si es del tipo "evaluacion"
  const renderBotContent = (m: any) => {
    if (m.tipo !== "evaluacion") {
      return <div className="whitespace-pre-wrap font-sans text-slate-200">{m.content}</div>;
    }

    const categoriasHSEC = ["Riesgos Materiales", "Controles Críticos", "EPP Obligatorio"];
    const tablaElementos: { section: string; text: string; key: string }[] = [];
    
    let textoLimpio = m.content.replace("VERIF.CATEGORÍA HSECELEMENTO / CONTROL MATERIAL", "");
    
    categoriasHSEC.forEach((categoria) => {
      const regex = new RegExp(`${categoria}(.*?)(?=(Riesgos Materiales|Controles Críticos|EPP Obligatorio|\\n\\n|$))`, "g");
      let match;
      let matchIndex = 0;

      while ((match = regex.exec(textoLimpio)) !== null) {
        let bloqueTexto = match[1].trim();
        bloqueTexto = bloqueTexto.replace(/^[:\-\*\s]+/, "").trim();

        if (bloqueTexto) {
          if (bloqueTexto.includes("\n")) {
            bloqueTexto.split("\n").forEach((subItem, subIdx) => {
              const itemLimpio = subItem.replace(/^[:\-\*\s\d\.]*/, "").trim();
              if (itemLimpio) {
                tablaElementos.push({
                  section: categoria,
                  text: itemLimpio,
                  key: `${m.id}-${categoria}-${matchIndex}-${subIdx}`
                });
              }
            });
          } else {
            const itemsSeparados = bloqueTexto.split(/\s*(?=\*(?!\*))|\s*-\s*/g);
            if (itemsSeparados.length > 1) {
              itemsSeparados.forEach((subItem, subIdx) => {
                const itemLimpio = subItem.replace(/^[:\-\*\s\d\.]*/, "").trim();
                if (itemLimpio) {
                  tablaElementos.push({
                    section: categoria,
                    text: itemLimpio,
                    key: `${m.id}-${categoria}-${matchIndex}-${subIdx}`
                  });
                }
              });
            } else {
              tablaElementos.push({
                section: categoria,
                text: bloqueTexto,
                key: `${m.id}-${categoria}-${matchIndex}`
              });
            }
          }
        }
        matchIndex++;
      }
    });

    if (tablaElementos.length === 0) {
      return <div className="whitespace-pre-wrap font-sans text-slate-200">{m.content}</div>;
    }

    let introduccion = "";
    const primerIndiceCat = Math.min(...categoriasHSEC.map(cat => m.content.indexOf(cat)).filter(idx => idx !== -1));
    if (primerIndiceCat > 0) {
      introduccion = m.content.substring(0, primerIndiceCat).replace("VERIF.CATEGORÍA HSECELEMENTO / CONTROL MATERIAL", "").trim();
    }

    return (
      <div className="space-y-4">
        {introduccion && (
          <div className="whitespace-pre-wrap font-sans opacity-90 text-xs border-b border-slate-700/40 pb-2 text-slate-300">
            {introduccion}
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-[#0B132B]/60 shadow-inner">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#131A35] text-[#FF5A00] uppercase tracking-wider border-b border-slate-700">
                <th className="py-3 px-4 font-bold w-12 text-center">Verif.</th>
                <th className="py-3 px-4 font-bold w-40">Categoría HSEC</th>
                <th className="py-3 px-4 font-bold">Elemento / Control Material</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tablaElementos.map((item) => (
                <tr key={item.key} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.key]}
                      onChange={() => toggleCheckItem(item.key)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#FF5A00] focus:ring-[#FF5A00] focus:ring-offset-slate-900 accent-[#FF5A00] cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-400 whitespace-nowrap">
                    {item.section}
                  </td>
                  <td className={`py-3 px-4 transition-all ${checkedItems[item.key] ? "line-through text-slate-500 opacity-50 italic" : "text-slate-200"}`}>
                    {item.text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#0B132B] text-slate-100 font-sans overflow-hidden">
      {/* 1. SIDEBAR CORPORATIVO BHP */}
      <aside className="w-80 bg-[#1C2541] flex flex-col justify-between border-r border-slate-800 shadow-2xl z-10 overflow-y-auto">
        <div className="p-6">
          <div className="mb-8 border-b border-slate-800 pb-5">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tighter text-[#FF5A00]">
                BHP
              </span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
                INTERNAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">
              Agente de Controles Críticos
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Operador en Sesión
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#FF5A00] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                    Rol Operacional
                  </label>
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

                <div className="mt-8">
                  <h3 className="text-sm font-bold mb-3 text-slate-300">📅 Calendario</h3>
                  <div className="bg-white rounded-xl p-2 text-black shadow-md">
                    <Calendar
                      value={selectedDate}
                      onChange={(value: any) => setSelectedDate(value)}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold mb-3 text-slate-300">
                    📋 Actividades del día
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {actividadesDia.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        No existen actividades para esta fecha.
                      </p>
                    ) : (
                      actividadesDia.map((actividad: any, index: number) => (
                        <button
                          key={index}
                          className="w-full text-left bg-slate-800 hover:bg-orange-600 p-2 rounded-lg transition text-xs text-slate-200"
                          onClick={() => enviarMensajeChat(actividad.actividad)}
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

        <div className="p-6 bg-[#131A35] border-t border-slate-800 text-[11px] text-slate-400 mt-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-slate-300">Monitoreo Activo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p>Aislamiento de datos activo por Rol.</p>
        </div>
      </aside>

      {/* 2. CONTENEDOR PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full bg-[#0B132B]">
        <header className="bg-[#1C2541] border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-md">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-xl">🛡️</span> Módulo Automatizado HSEC
            </h2>
            <p className="text-xs text-slate-400">
              Mitigación automatizada del factor humano en la asignación de riesgos.
            </p>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-xl text-center space-y-4">
                <div className="w-16 h-16 bg-[#FF5A00]/10 text-[#FF5A00] rounded-2xl flex items-center justify-center mx-auto border border-[#FF5A00]/20 text-2xl shadow-inner">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-slate-200">
                  Asistente Predictivo de Controles Críticos
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ingresa las actividades planificadas para el mes o describe condiciones específicas en terreno. El agente cruzará la data histórica y dictaminará los controles materiales de inmediato.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-6 py-4 shadow-lg border text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#FF5A00] border-[#FF5A00] text-white rounded-br-none"
                      : "bg-[#1C2541] border-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 opacity-70 border-b border-slate-700/30 pb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest">
                      {m.role === "user" ? userName : "AGENTE INTELIGENTE BHP"}
                    </span>
                    <span className="text-[9px] font-mono">{m.time}</span>
                  </div>
                  
                  {m.role === "user" ? (
                    <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                  ) : (
                    renderBotContent(m)
                  )}

                  {/* Descarga estricta por flag tipo "evaluacion" */}
                  {m.role === "assistant" && m.tipo === "evaluacion" && (
                    <div className="mt-4 pt-3 border-t border-slate-700/40 flex justify-end">
                      <button
                        onClick={() => {
                          const idx = messages.findIndex(msg => msg.id === m.id);
                          const userPrompt = idx > 0 ? messages[idx - 1].content : "Actividad General";
                          generarChecklistPDF(userPrompt, m.content, userName, userRole);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-white font-bold tracking-wide text-xs uppercase flex items-center gap-2 transition shadow-md"
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
              <div className="bg-[#1C2541] border border-slate-800 rounded-2xl rounded-bl-none px-6 py-4 shadow-md max-w-xs">
                <div className="flex space-x-2 items-center justify-center h-4">
                  <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer className="p-6 bg-[#131A35] border-t border-slate-800 shadow-inner">
          <form onSubmit={handleSubmit} className="flex space-x-4 max-w-5xl mx-auto">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Escriba aquí la actividad operacional programada (ej: Desarme de andamios)..."
                className="w-full bg-[#0B132B] text-slate-200 border border-slate-700 rounded-xl pl-5 pr-4 py-4 text-sm focus:outline-none focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] transition-all placeholder:text-slate-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#FF5A00] hover:bg-[#E04F00] disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 font-bold px-8 rounded-xl text-sm transition-all shadow-md tracking-wide uppercase flex items-center"
            >
              Evaluar Tarea
            </button>
          </form>
        </footer>
      </main>

      {/* Modal de Reporte de Riesgos HSEC */}
      {mostrarReporte && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl w-[520px] p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              🚨 Reportar Riesgo No Controlado
            </h2>

            <div className="space-y-3">
              <input
                className="w-full p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Actividad"
                value={actividadReporte}
                onChange={(e) => setActividadReporte(e.target.value)}
              />

              <input
                className="w-full p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Riesgo observado"
                value={riesgoReporte}
                onChange={(e) => setRiesgoReporte(e.target.value)}
              />

              <textarea
                className="w-full p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-red-600 transition-colors resize-none"
                placeholder="Descripción detallada de la anomalía..."
                rows={4}
                value={descripcionReporte}
                onChange={(e) => setDescripcionReporte(e.target.value)}
              />

              <input
                className="w-full p-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-red-600 transition-colors"
                placeholder="Lugar / Sector Operacional"
                value={lugarReporte}
                onChange={(e) => setLugarReporte(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setMostrarReporte(false)}
                className="bg-gray-600 hover:bg-gray-700 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition"
              >
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
                className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition text-white shadow-md"
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