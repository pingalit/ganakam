const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

/** Format a number as Indian Rupees — e.g. ₹1,20,000 */
export function formatINR(value: number): string {
  return INR_FORMATTER.format(Math.round(value))
}

/** Format a number as plain Indian number with commas — e.g. 1,20,000 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value))
}

/** Parse a string to a number, stripping currency symbols and commas */
export function parseINR(value: string): number {
  return Number(value.replace(/[₹,\s]/g, '')) || 0
}
