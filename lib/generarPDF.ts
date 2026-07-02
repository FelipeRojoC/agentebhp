import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generarChecklistPDF(actividad: string, contenidoBot: string, supervisor: string, rol?: string) {
  const doc = new jsPDF();
  const fechaActual = new Date().toLocaleDateString();

  // --- 1. CONFIGURACIÓN E INYECCIÓN DE CABECERA CORPORATIVA BHP ---
  // Franja superior con el color naranja institucional de BHP
  doc.setFillColor(255, 90, 0);
  doc.rect(0, 0, 220, 8, "F");

  // Logo tipográfico institucional
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  // CORRECCIÓN: Se usa el método setTextColor en lugar de la asignación directa
  doc.setTextColor(11, 19, 43);
  doc.text("BHP", 14, 25);

  // Subtítulo técnico del formulario
  doc.setFontSize(13);
  doc.text("CHECKLIST DE CONTROLES CRÍTICOS HSEC", 14, 34);
  doc.setLineWidth(0.5);
  doc.setDrawColor(224, 224, 224);
  doc.line(14, 38, 196, 38);

  // Cuadrícula limpia de metadatos del proyecto
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Supervisor:", 14, 45);
  doc.setFont("helvetica", "normal");
  doc.text(supervisor || "Felipe Rojo", 35, 45);

  doc.setFont("helvetica", "bold");
  doc.text("Rol:", 14, 51);
  doc.setFont("helvetica", "normal");
  doc.text(rol || "Supervisor de Terreno", 35, 51);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 130, 45);
  doc.setFont("helvetica", "normal");
  doc.text(fechaActual, 145, 45);

  doc.setFont("helvetica", "bold");
  doc.text("Actividad:", 130, 51);
  doc.setFont("helvetica", "normal");
  
  // Limpieza del nombre de la actividad para que no use espacio excesivo en la cabecera
  const actividadLimpia = actividad.replace(/Evaluación HSEC|Checklist/gi, "").trim();
  doc.text(actividadLimpia.substring(0, 24) + (actividadLimpia.length > 24 ? "..." : ""), 145, 51);

  // --- 2. PARSER AVANZADO Y SEPARACIÓN DE PÁRRAFOS ---
  const filasTabla: any[] = [];
  const categoriasHSEC = ["Riesgos Materiales", "Controles Críticos", "EPP Obligatorio"];
  
  // Limpiamos rastros de caracteres extraños que puedan venir del streaming
  let textoLimpio = contenidoBot.replace("VERIF.CATEGORÍA HSECELEMENTO / CONTROL MATERIAL", "");

  categoriasHSEC.forEach((categoria) => {
    // Buscamos dinámicamente los bloques correspondientes a cada encabezado
    const regex = new RegExp(`${categoria}(.*?)(?=(Riesgos Materiales|Controles Críticos|EPP Obligatorio|\\n\\n|$))`, "s");
    const match = regex.exec(textoLimpio);
    
    if (match && match[1]) {
      const bloqueTexto = match[1].trim();
      
      // Separamos los elementos que vengan segmentados por saltos de línea o viñetas
      const lineasBloque = bloqueTexto.split(/\n+/);
      
      lineasBloque.forEach((linea) => {
        let textoItem = linea.trim();
        
        // Expresión regular para quitar asteriscos de viñetas (* o **), guiones (-) y números iniciales
        textoItem = textoItem.replace(/^[:\-\*\s\d\.]*/, "").trim();
        
        // Limpiamos asteriscos sobrantes intermedios para que no se vea feo el texto plano
        textoItem = textoItem.replace(/\*\*/g, "");

        // Si la línea contiene texto válido que no sea una viñeta vacía de control, se añade a la tabla
        if (textoItem && textoItem.length > 3 && !textoItem.toLowerCase().startsWith("supervisor") && !textoItem.toLowerCase().startsWith("ejecutor")) {
          filasTabla.push(["[  ]", categoria, textoItem]);
        }
      });
    }
  });

  // Fallback de emergencia si el formateador no encuentra concordancias con las expresiones regulares
  if (filasTabla.length === 0) {
    textoLimpio.split("\n").forEach((linea) => {
      const l = linea.trim().replace(/^[:\-\*\s\d\.]*/, "").replace(/\*\*/g, "");
      if (l && l.length > 3) {
        filasTabla.push(["[  ]", "Análisis Terreno", l]);
      }
    });
  }

  // --- 3. CONSTRUCCIÓN AUTOPAGINADA DE LA TABLA ---
  autoTable(doc, {
    startY: 58,
    head: [["Verif.", "Categoría HSEC", "Control Requerido / Elemento de Mitigación Predictiva"]],
    body: filasTabla,
    theme: "striped",
    headStyles: { 
      fillColor: [28, 37, 65], // Azul marino industrial del layout principal
      textColor: [255, 255, 255], 
      fontStyle: "bold",
      fontSize: 10 
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center", fontStyle: "bold" }, // Caja [  ] espaciada de forma óptima
      1: { cellWidth: 42, fontStyle: "bold" },
      2: { cellWidth: "auto" }
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 4,
      valign: "middle",
      overflow: "linebreak" // Forzamos el salto de línea automático en celdas largas para que no se corten
    },
    gridLineColor: [220, 220, 220]
  });

  // --- 4. CONTROL DINÁMICO DE POSICIÓN PARA LAS FIRMAS ---
  // Capturamos el final real de la tabla generada por autotable
  const finalY = (doc as any).lastAutoTable.finalY + 30;

  // Si las firmas quedan muy al límite de la página (abajo de los 240mm de alto),
  // se añade automáticamente otra página para que no se amontone nada.
  if (finalY < 240) {
    dibujarBloqueFirmas(doc, finalY, supervisor);
  } else {
    doc.addPage();
    
    // Al añadir una página nueva, volvemos a inyectar la franja naranja BHP arriba para mantener la estética
    doc.setFillColor(255, 90, 0);
    doc.rect(0, 0, 220, 8, "F");
    
    dibujarBloqueFirmas(doc, 40, supervisor);
  }

  // Descarga automatizada del archivo
  doc.save(`Checklist_HSEC_${fechaActual.replace(/\//g, "-")}.pdf`);
}

function dibujarBloqueFirmas(doc: jsPDF, y: number, supervisor: string) {
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.6);
  
  // Bloque de Firma 1: Supervisor de Operaciones (Izquierda)
  doc.line(20, y, 85, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  // CORRECCIÓN: Se reemplaza la asignación directa por setTextColor con valores numéricos individuales
  doc.setTextColor(100, 100, 100);
  doc.text("Firma Supervisor Operacional", 22, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 19, 43);
  doc.text(supervisor || "Felipe Rojo", 22, y + 10);

  // Bloque de Firma 2: Líder / Asesor HSEC (Derecha)
  doc.line(125, y, 190, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Firma Asesor / Líder HSEC", 127, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 19, 43);
  doc.text("Validación Terreno BHP", 127, y + 10);
}