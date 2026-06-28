import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const mensaje = body.message?.trim() || "";

    const mensajeLower = mensaje.toLowerCase();

    // ===========================
    // Detectar conversación normal
    // ===========================

    const saludos = [
      "hola",
      "hola!",
      "buenas",
      "buenos días",
      "buenas tardes",
      "buenas noches",
      "como estas",
      "cómo estás",
      "que tal",
      "qué tal",
      "gracias",
      "muchas gracias",
      "adiós",
      "chao",
      "bye",
      "hasta luego",
    ];

    const esConversacion = saludos.some((s) =>
      mensajeLower.includes(s)
    );

    if (esConversacion) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
Eres el Agente Inteligente HSEC de BHP.

Si el usuario solamente conversa contigo responde de forma natural, cordial y breve.

No hables de riesgos.

No hagas análisis HSEC.

Mensaje:

${mensaje}
`,
      });

      return NextResponse.json({
        ok: true,
        respuesta: response.text,
      });
    }

    // ===========================
    // Buscar riesgos históricos
    // ===========================

    const { data: riesgos, error } = await supabase
      .from("matriz_riesgos")
      .select("actividad, riesgo")
      .ilike("actividad", `%${mensaje}%`)
      .limit(5);

    if (error) {
      console.error("Error Supabase:", error);
    }

    // ===========================
    // Prompt HSEC
    // ===========================

    const prompt = `
Eres un Supervisor Senior HSEC de BHP especializado en Controles Críticos.

DATOS DEL OPERADOR

Nombre: ${body.userName}
Cargo: ${body.userRole}

ACTIVIDAD

${mensaje}

RIESGOS ENCONTRADOS EN LA MATRIZ HISTÓRICA

${
  riesgos && riesgos.length > 0
    ? JSON.stringify(riesgos, null, 2)
    : "No se encontraron actividades similares en la matriz."
}

INSTRUCCIONES

Utiliza SIEMPRE los antecedentes encontrados.

Si no existen antecedentes, utiliza tu conocimiento HSEC para complementar la respuesta.

Responde EXACTAMENTE con el siguiente formato:

# Evaluación HSEC

## Actividad

(resumen)

## Riesgos Materiales

- ...

## Controles Críticos

- ...

## EPP Obligatorio

- ...

## ¿Requiere OVCC?

Sí o No.
Explica brevemente.

## Nivel de Riesgo

Bajo
Medio
Alto
Crítico

No inventes información innecesaria.
No agregues introducciones largas.
Sé ejecutivo y profesional.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({
      ok: true,
      respuesta: response.text,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}