'use strict';


const UPPER_BITS_MASK = 0xFF00;
const LOWER_BITS_MASK = 0xFF;

exports.patchUInt16 = function(buf, offset, val) {
    const lowerBits = val & LOWER_BITS_MASK;
    const upperBits = (val & UPPER_BITS_MASK)>>>8;
    // Little Endian...
    buf[offset] = lowerBits;
    buf[offset+1] = upperBits;
};

exports.patchUInt8 = function(buf, offset, val) {
    const lowerBits = val & LOWER_BITS_MASK;
    buf[offset] = lowerBits;
};

exports.unique = function(arr) {
    return Array.from(new Set(arr));
};
