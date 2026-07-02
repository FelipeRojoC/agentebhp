import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Forzamos al SDK a inicializarse usando tu variable de entorno local de forma estricta
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(request: Request) {
  // Si la llave está vacía o indefinida, enviamos una alerta controlada al frontend
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      respuesta: "Error de configuración: La variable GEMINI_API_KEY no se encuentra definida o cargada en el entorno local del servidor.",
      tipo: "chat"
    }, { status: 200 });
  }

  try {
    // Extraemos los datos que envía el frontend
    const { message, userName, userRole } = await responseJson(request);

    // Prompt industrial estructurado con el contexto de BHP
    const prompt = `
      Eres el Agente de Controles Críticos e Inteligencia Artificial de BHP.
      Tu objetivo es evaluar riesgos operacionales en faena minera.
      
      Usuario en sesión:
      - Nombre: ${userName || "Felipe Rojo"}
      - Rol: ${userRole || "Supervisor de Terreno"}
      
      Actividad a evaluar:
      "${message}"
      
      Por favor, entrega una evaluación detallada utilizando estrictamente la siguiente estructura en tu respuesta si detectas riesgos operacionales:
      # Evaluación HSEC
      ## Riesgos Materiales
      (Lista de riesgos detectados con viñetas)
      ## Controles Críticos
      (Lista de controles materiales preventivos con viñetas)
      ## EPP Obligatorio
      (Lista de elementos de protección obligatorios)
    `;

    // Llamado seguro a la API de Inteligencia Artificial
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const respuestaTexto = response.text || "";

    // Determinamos el tipo de respuesta: si contiene la estructura HSEC, activamos los componentes de tabla y PDF
    const esEvaluacion = respuestaTexto.includes("Riesgos Materiales") || respuestaTexto.includes("HSEC");

    return NextResponse.json({
      ok: true,
      respuesta: respuestaTexto,
      tipo: esEvaluacion ? "evaluacion" : "chat"
    });

  } catch (error: any) {
    console.error("Error en el endpoint de asistencia HSEC:", error);
    
    // Mitigación del error 503 (Saturación / High Demand) o cualquier falla de red
    return NextResponse.json({
      ok: false,
      respuesta: "El sistema de IA de Controles Críticos está experimentando una alta demanda temporal en sus servidores. Por favor, reintente evaluar la tarea en unos instantes.",
      tipo: "chat"
    }, { status: 200 }); // Retornamos 200 para que el cliente lo maneje como mensaje en el chat sin colgar la app
  }
}

// Función auxiliar para parsear el body de forma segura
async function responseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}