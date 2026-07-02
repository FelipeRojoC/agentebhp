import { jsPDF } from "jspdf";

export function generarChecklistPDF(
  actividad: string,
  respuesta: string,
  supervisor: string
) {
  const pdf = new jsPDF();

  // Encabezado
  pdf.setFillColor(255, 90, 0);
  pdf.rect(0, 0, 210, 20, "F");

  pdf.setTextColor(255,255,255);
  pdf.setFontSize(22);
  pdf.text("BHP",15,13);

  pdf.setFontSize(12);
  pdf.text("CHECKLIST HSEC",170,13);

  pdf.setTextColor(0,0,0);

  pdf.setFontSize(14);

  pdf.text("Supervisor:",15,35);
  pdf.text(supervisor,55,35);

  pdf.text("Fecha:",15,45);
  pdf.text(new Date().toLocaleDateString(),55,45);

  pdf.text("Actividad:",15,55);
  pdf.text(actividad,55,55);

  pdf.line(15,60,195,60);

  pdf.setFontSize(15);
  pdf.text("Checklist generado por IA",15,72);

  pdf.setFontSize(11);

  const texto = pdf.splitTextToSize(respuesta,170);

  pdf.text(texto,15,82);

  let y=180;

  pdf.setFontSize(14);

  pdf.text("Firmas",15,y);

  y+=20;

  pdf.line(20,y,80,y);
  pdf.line(120,y,180,y);

  pdf.text("Supervisor",30,y+8);
  pdf.text("Ejecutor",135,y+8);

  pdf.save("Checklist_BHP.pdf");
}