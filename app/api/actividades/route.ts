import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("actividades_programadas")
      .select("*");

    if (error) {
      console.error("Error en Supabase:", error);
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    console.error("Error de servidor:", err);
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}