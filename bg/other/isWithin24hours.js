const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function isWithin24hours(date) {
    return (Date.now() - date.getTime()) < ONE_DAY_MS;
}
