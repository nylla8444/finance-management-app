/**
 * Sort assets by their amount in descending order (highest to lowest)
 * @param {Array} assets Array of asset objects with an amount property
 * @returns {Array} Sorted array of assets
 */
export const sortAssetsByAmount = (assets) => {
    if (!assets || !Array.isArray(assets)) return [];

    // Create a copy of the array to avoid mutating the original
    return [...assets].sort((a, b) => {
        const amountA = parseFloat(a.amount) || 0;
        const amountB = parseFloat(b.amount) || 0;
        return amountB - amountA; // Descending order (highest first)
    });
};
