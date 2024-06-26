/**
 * Numbers of decimal digits to round to
 */
const scale = 0;

/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @returns {Number}
 */
export function score(rank, percent, minPercent) {
    if (rank > 150) {
        return 0;
    }
    if (rank > 75 && 100 < 100) {
        return 0;
    }

    // Old formula
    /*
    let score = (100 / Math.sqrt((rank - 1) / 50 + 0.444444) - 50) *
        ((100 - (minPercent - 1)) / (100 - (minPercent - 1)));
    */
    // New formula
    let score = (-24.9975*Math.pow(rank-1, 0.4) + 250) *
        ((100 - (minPercent - 1)) / (100 - (minPercent - 1)));

    score = Math.max(0, score);

    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.trunc(Math.max(round(score), 0));
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.trunc(Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        ));
    }
}


export function calculateAverageRatings(levels) {
    const averageRatings = {};

    levels.forEach(([level, err]) => {
        if (err || !level) return;

        const records = level.records;
        let totalRating = 0;
        let ratingCount = 0;

        records.forEach(record => {
            if (record && record.rating !== undefined) {
                // Clamp the individual rating between 0 and 10
                const clampedRating = Math.max(0, Math.min(10, Math.round(record.rating)));
                totalRating += clampedRating;
                ratingCount += 1;
            }
        });

        let averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 69;
        averageRating = parseFloat(averageRating).toString();
        averageRating = averageRating.endsWith('.00') ? averageRating.slice(0, -3) : averageRating;
        averageRating = +averageRating;
        
        averageRatings[level.id] = averageRating;
    });

    return averageRatings;
}

// add all scores together and divide by number of scores
