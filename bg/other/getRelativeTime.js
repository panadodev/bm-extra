const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const TIME_THRESHOLDS = [
    { unit: "year",   ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: "month",  ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: "day",    ms: 24 * 60 * 60 * 1000 },
    { unit: "hour",   ms: 60 * 60 * 1000 },
    { unit: "minute", ms: 60 * 1000 },
    { unit: "second", ms: 1000 },
];

export function getRelativeTime(date) {
    const diffMs = date.getTime() - Date.now();
    const absDiff = Math.abs(diffMs);

    for (const { unit, ms } of TIME_THRESHOLDS) {
        if (absDiff >= ms || unit === "second") {
            return formatter.format(Math.round(diffMs / ms), unit);
        }
    }
}
