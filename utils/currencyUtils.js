/**
 * Utility functions for currency operations
 */

/**
 * Get the currency symbol for a given currency code
 * @param {string} currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR', 'PHP')
 * @returns {string} The currency symbol
 */
export const getCurrencySymbol = (currencyCode) => {
    const currencySymbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CNY: '¥',
        PHP: '₱',
        INR: '₹',
        RUB: '₽',
        THB: '฿',
        KRW: '₩',
        AUD: 'A$',
        CAD: 'C$',
        // Add more currency codes as needed
    };

    return currencySymbols[currencyCode] || currencyCode;
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode) => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
};
