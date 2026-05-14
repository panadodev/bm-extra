export let bmRateLimitRemaining = null;
export let bmRateLimitMax = null;

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRateLimit(url, options) {
    const resp = await fetch(url, options);

    if (url.includes("api.battlemetrics.com")) {
        const remaining = resp.headers.get("x-rate-limit-remaining");
        const max = resp.headers.get("x-rate-limit-limit");
        if (remaining !== null) bmRateLimitRemaining = parseInt(remaining, 10);
        if (max !== null) bmRateLimitMax = parseInt(max, 10);
    }

    if (resp.status !== 429) return resp;

    const retryAfter = resp.headers.get("Retry-After");
    const wait = retryAfter ? parseFloat(retryAfter) * 1000 : 10000;
    await sleep(wait);

    const retryResp = await fetch(url, options);
    if (retryResp.status === 429) throw new Error("RATE_LIMIT");
    return retryResp;
}
