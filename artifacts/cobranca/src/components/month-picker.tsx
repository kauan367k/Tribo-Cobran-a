import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMonth } from "@/hooks/use-month";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export function MonthPicker() {
  const { referenceMonth, setReferenceMonth } = useMonth();

  // Generate a list of months: current month, 3 months back, 3 months forward
  const current = new Date();
  const months = Array.from({ length: 7 }).map((_, i) => {
    const date = addMonths(subMonths(current, 3), i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy", { locale: ptBR });
    // Capitalize first letter
    return {
      value,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    };
  });

  // Ensure current referenceMonth is in the list
  if (!months.find((m) => m.value === referenceMonth)) {
    const date = new Date(`${referenceMonth}-01T00:00:00Z`);
    const label = format(date, "MMMM yyyy", { locale: ptBR });
    months.push({
      value: referenceMonth,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
    months.sort((a, b) => a.value.localeCompare(b.value));
  }

  return (
    <Select value={referenceMonth} onValueChange={setReferenceMonth}>
      <SelectTrigger className="w-[180px] bg-white dark:bg-card">
        <SelectValue placeholder="Selecione o mês" />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
