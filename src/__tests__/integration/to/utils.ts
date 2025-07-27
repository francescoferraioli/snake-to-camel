export function format_date(theDate: Date): string {
  const year = theDate.getFullYear();
  const month = theDate.getMonth() + 1;
  const day = theDate.getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
