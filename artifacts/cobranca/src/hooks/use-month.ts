import { create } from "zustand";
import { format } from "date-fns";

interface MonthState {
  referenceMonth: string; // YYYY-MM
  setReferenceMonth: (month: string) => void;
}

export const useMonth = create<MonthState>((set) => ({
  referenceMonth: format(new Date(), "yyyy-MM"),
  setReferenceMonth: (month) => set({ referenceMonth: month }),
}));
