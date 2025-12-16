/**
 * Format number with Danish locale (thousands separator and comma for decimals)
 * @param {number} number - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number (e.g., 1.000,00)
 */
export const formatCurrency = (number, decimals = 2) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0,00';
  }
  
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
};

/**
 * Format currency with kr. suffix
 * @param {number} number - The number to format
 * @returns {string} Formatted currency (e.g., 1.000,00 kr.)
 */
export const formatCurrencyWithUnit = (number) => {
  return `${formatCurrency(number)} kr.`;
};
