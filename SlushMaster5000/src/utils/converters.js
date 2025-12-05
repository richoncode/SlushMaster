export const UNITS = {
    ORIGINAL: 'original',
    ML: 'ml',
    OZ: 'oz',
    CUPS: 'cups'
};

// Conversion factors (1 unit = X ml)
const TO_ML = {
    oz: 29.5735,
    cup: 236.588,
    tbsp: 14.7868,
    tsp: 4.92892,
    liter: 1000,
    gallon: 3785.41
};

/**
 * Formats a value in milliliters to the target unit.
 * @param {number} ml - The amount in milliliters.
 * @param {string} targetUnit - 'ml', 'oz', or 'cups'.
 * @returns {string} - The formatted string (e.g., "1.5 oz").
 */
export const convertUnit = (ml, targetUnit) => {
    if (!ml || isNaN(ml)) return null;

    switch (targetUnit) {
        case UNITS.ML:
            return `${Math.round(ml)} ml`;
        case UNITS.OZ:
            const oz = ml / TO_ML.oz;
            return `${parseFloat(oz.toFixed(1))} oz`;
        case UNITS.CUPS:
            const cups = ml / TO_ML.cup;
            // format to common fractions if close
            return formatFraction(cups) + ' cup' + (cups > 1 ? 's' : '');
        default:
            return null;
    }
};

// Helper to format decimal cups to fractions
const formatFraction = (val) => {
    const tolerance = 0.1;
    if (Math.abs(val - 0.25) < tolerance) return '1/4';
    if (Math.abs(val - 0.33) < tolerance) return '1/3';
    if (Math.abs(val - 0.5) < tolerance) return '1/2';
    if (Math.abs(val - 0.66) < tolerance) return '2/3';
    if (Math.abs(val - 0.75) < tolerance) return '3/4';
    if (Math.abs(val - 1) < tolerance) return '1';

    // If whole number
    if (Math.abs(val - Math.round(val)) < tolerance) return Math.round(val).toString();

    return val.toFixed(2);
};
