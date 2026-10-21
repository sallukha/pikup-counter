/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats an integer amount in paise into an Indian Rupee (INR) display string.
 *
 * Requirements:
 * - Integer paise is ALWAYS the source of truth.
 * - Floating-point rupees are never used as authoritative state.
 * - Converted to INR strictly for user-facing visual rendering.
 *
 * @param paise - Integer amount in paise (e.g. 2000 paise = ₹20.00)
 * @returns Formatted currency string, e.g. "₹20.00" or "₹1,250.00"
 */
export function formatPaiseToINR(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return '₹0.00';
  }

  // Ensure integer value before converting to display rupees
  const safeIntegerPaise = Math.round(paise);
  const rupees = safeIntegerPaise / 100;

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rupees);
  } catch {
    // Fallback if Intl is unavailable or fails
    return `₹${rupees.toFixed(2)}`;
  }
}

/**
 * Calculates sum of paise values safely as integers.
 */
export function sumPaise(amounts: number[]): number {
  return amounts.reduce((total, amt) => total + Math.round(amt || 0), 0);
}
