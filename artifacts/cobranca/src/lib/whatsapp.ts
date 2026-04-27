import { formatCurrency, formatMonthLabel } from "./format";

const PHONE_RE = /\d/g;

export function extractPhoneDigits(contact: string | null | undefined): string | null {
  if (!contact) return null;
  const digits = (contact.match(PHONE_RE) ?? []).join("");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function buildOverdueMessage(params: {
  payerName: string;
  cityName: string;
  amount: number;
  referenceMonth: string;
  dueDay: number;
}): string {
  const { payerName, cityName, amount, referenceMonth, dueDay } = params;
  const monthLabel = formatMonthLabel(referenceMonth);
  const firstName = payerName.split(/\s+/)[0] ?? payerName;
  return [
    `Olá, ${firstName}! Tudo bem?`,
    "",
    `Estou passando para lembrar sobre a cobrança referente a ${monthLabel} (${cityName}), com vencimento no dia ${dueDay}, no valor de ${formatCurrency(amount)}, que ainda consta em aberto.`,
    "",
    "Assim que possível, me avise sobre o pagamento. Qualquer dúvida estou à disposição.",
    "",
    "Obrigado!",
  ].join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
