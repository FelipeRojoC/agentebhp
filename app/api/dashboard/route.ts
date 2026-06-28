import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {

    // Leer actividades programadas
    const { data: actividades, error: errorActividades } = await supabase
      .from("programacion")
      .select("*")
      .order("fecha_programada", { ascending: true });

    if (errorActividades) {
      throw errorActividades;
    }

    // Leer matriz de riesgos
    const { count: totalRiesgos, error: errorRiesgos } = await supabase
      .from("matriz_riesgos")
      .select("*", { count: "exact", head: true });

    if (errorRiesgos) {
      throw errorRiesgos;
    }

    // Obtener meses únicos

    const meses = [...new Set(
      actividades.map((a: any) => {

        const fecha = new Date(a.fecha_programada);

        return fecha.toLocaleString("es-CL", {
          month: "long",
          year: "numeric"
        });

      })
    )];

    // Contar actividades por mes

    const actividadesPorMes = meses.map((mes) => {

      const total = actividades.filter((a: any) => {

        const fecha = new Date(a.fecha_programada);

        const nombreMes = fecha.toLocaleString("es-CL", {
          month: "long",
          year: "numeric"
        });

        return nombreMes === mes;

      }).length;

      return {

        mes,

        total

      };

    });

    return NextResponse.json({

      months: meses,

      actividadesPorMes,

      totalRiesgos,

      actividades

    });

  } catch (err: any) {

    return NextResponse.json({

      error: err.message

    }, {

      status: 500

    });

  }
}