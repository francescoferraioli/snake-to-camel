type SkipReason =
  | 'already camelCase'
  | 'would shadow'
  | 'would be shadowed'
  | 'property in type or interface'
  | 'shorthand destructuring';
type Status = 'skip' | 'success';
// CSV logging with prefix for easy filtering
const CSV_PREFIX = 'SNAKE_TO_CAMEL_CSV:';
let csvHeadersLogged = false;
const csvHeaders: (keyof RenamingContextData)[] = [
  'timestamp',
  'filename',
  'identifier',
  'status',
  'reason',
  'shorthandHandled',
];
function logCsvHeaders(): void {
  if (!csvHeadersLogged) {
    console.log(`${CSV_PREFIX}${csvHeaders.join(',')}`);
    csvHeadersLogged = true;
  }
}
type RenamingContextData = {
  timestamp: string;
  filename: string;
  identifier?: string;
  status?: Status;
  reason?: SkipReason;
  shorthandHandled?: boolean;
};
// Structured logging context builder
export class RenamingContext {
  private context: RenamingContextData;

  constructor(filename: string, identifier: string) {
    this.context = {
      timestamp: new Date().toISOString(),
      filename,
      identifier,
    };
  }

  skip(reason: SkipReason): void {
    this.context.status = 'skip';
    this.context.reason = reason;
    this.log();
  }

  success(shorthandHandled: boolean = false): void {
    this.context.status = 'success';
    this.context.shorthandHandled = shorthandHandled;
    this.log();
  }

  private log(): void {
    logCsvHeaders();
    const csvLine = csvHeaders
      .map((header) => `"${this.context[header] ?? ''}"`)
      .join(',');

    console.log(`${CSV_PREFIX}${csvLine}`);
  }
}
