export interface BulkCSVRow {
  name: string
  annualCTC: number
  tierId: string
}

/**
 * Parse a CSV string for bulk upload.
 * Expected header: Name,AnnualCTC,TierID
 * Rows after header are processed; blank rows are skipped.
 */
export function parseCSV(content: string): { rows: BulkCSVRow[]; errors: string[] } {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { rows: [], errors: ['Empty file'] }

  // Skip header row
  const dataLines = lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines

  const rows: BulkCSVRow[] = []
  const errors: string[] = []

  dataLines.forEach((line, idx) => {
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
    if (parts.length < 3) {
      errors.push(`Row ${idx + 2}: expected Name, AnnualCTC, TierID (got "${line}")`)
      return
    }
    const [name, ctcStr, tierId] = parts
    const annualCTC = Number(ctcStr)
    if (!name) { errors.push(`Row ${idx + 2}: Name is empty`); return }
    if (isNaN(annualCTC) || annualCTC <= 0) { errors.push(`Row ${idx + 2}: Invalid CTC "${ctcStr}"`); return }
    if (!tierId) { errors.push(`Row ${idx + 2}: TierID is empty`); return }
    rows.push({ name, annualCTC, tierId })
  })

  return { rows, errors }
}

/**
 * Generate a CSV template string for the bulk upload format.
 */
export function generateCSVTemplate(): string {
  return [
    'Name,AnnualCTC,TierID',
    'Priya Sharma,600000,tier2',
    'Ravi Kumar,360000,tier3',
    'Anita Nair,1200000,tier1'
  ].join('\n')
}

/**
 * Serialize an array of arrays to CSV.
 */
export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') ? `"${s}"` : s
  }
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\n')
}
