import { getRelativeTime } from "./getRelativeTime.js";

export function convertDate(date) {
    const localDate = date.toLocaleDateString();
    const relative = getRelativeTime(date);
    return `${localDate} (${relative})`;
}
