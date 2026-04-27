export function currentReferenceMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isOverdue(referenceMonth: string, dueDay: number): boolean {
  const [yearStr, monthStr] = referenceMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return false;
  }
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  if (year < todayYear) return true;
  if (year > todayYear) return false;
  if (month < todayMonth) return true;
  if (month > todayMonth) return false;
  return todayDay > dueDay;
}
