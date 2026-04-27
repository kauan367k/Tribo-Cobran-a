import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CityWithSummary, PayerWithStatus } from "@workspace/api-client-react";
import { formatCurrency, formatMonthLabel, formatDateTime, formatRelativeDate } from "./format";

const STATUS_LABEL: Record<PayerWithStatus["status"], string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Em atraso",
};

const STATUS_COLOR: Record<PayerWithStatus["status"], [number, number, number]> = {
  paid: [16, 122, 87],
  pending: [161, 98, 7],
  overdue: [185, 28, 28],
};

export function generateCityReport(params: {
  city: CityWithSummary;
  payers: PayerWithStatus[];
  referenceMonth: string;
}): void {
  const { city, payers, referenceMonth } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(23, 65, 50);
  doc.text("Cobrança Mensal", margin, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Relatório gerado em ${formatDateTime(new Date().toISOString())}`,
    pageWidth - margin,
    50,
    { align: "right" }
  );

  doc.setDrawColor(220);
  doc.line(margin, 64, pageWidth - margin, 64);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20);
  doc.text(city.name, margin, 90);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(
    `${formatMonthLabel(referenceMonth)} · Vencimento dia ${city.dueDay}`,
    margin,
    108
  );

  if (city.notes) {
    doc.setFontSize(10);
    doc.setTextColor(110);
    const notes = doc.splitTextToSize(city.notes, pageWidth - margin * 2);
    doc.text(notes, margin, 124);
  }

  const summaryY = city.notes ? 150 : 130;
  const boxes = [
    { label: "Previsto", value: formatCurrency(city.expectedTotal), color: [50, 50, 50] as [number, number, number] },
    { label: "Recebido", value: formatCurrency(city.receivedTotal), color: [16, 122, 87] as [number, number, number] },
    { label: "Em atraso", value: formatCurrency(city.overdueTotal), color: [185, 28, 28] as [number, number, number] },
    { label: "Pagantes", value: String(city.payersCount), color: [50, 50, 50] as [number, number, number] },
  ];
  const boxWidth = (pageWidth - margin * 2 - 24) / 4;
  boxes.forEach((box, i) => {
    const x = margin + i * (boxWidth + 8);
    doc.setDrawColor(220);
    doc.setFillColor(248, 250, 250);
    doc.roundedRect(x, summaryY, boxWidth, 56, 4, 4, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(box.label.toUpperCase(), x + 10, summaryY + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...box.color);
    doc.text(box.value, x + 10, summaryY + 38);
  });

  const tableStartY = summaryY + 80;

  const rows = payers.map((p) => [
    p.name,
    formatCurrency(p.monthlyAmount),
    STATUS_LABEL[p.status],
    p.paidAt ? formatRelativeDate(p.paidAt) : "—",
    p.paidAmount != null ? formatCurrency(p.paidAmount) : "—",
    p.contact ?? "—",
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["Pagante", "Valor mensal", "Status", "Pago em", "Valor recebido", "Contato"]],
    body: rows.length > 0 ? rows : [["Nenhum pagante cadastrado", "", "", "", "", ""]],
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [23, 122, 87], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 250] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2 && rows.length > 0) {
        const status = payers[data.row.index]?.status;
        if (status) {
          data.cell.styles.textColor = STATUS_COLOR[status];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  const safeName = city.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "_");
  doc.save(`cobranca_${safeName}_${referenceMonth}.pdf`);
}
