export function format_date(the_date: Date): string {
  const year = the_date.getFullYear();
  const month = the_date.getMonth() + 1;
  const day = the_date.getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
