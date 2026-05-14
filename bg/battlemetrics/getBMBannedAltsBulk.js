import { fetchWithRateLimit } from "../other/fetchWithRateLimit.js";

async function fetchPlayerBans(playerId, token) {
    const url = `https://api.battlemetrics.com/bans?version=%5E0.1.0&filter[player]=${playerId}&access_token=${token}`;
    const response = await fetchWithRateLimit(url);
    if (!response.ok) return null;
    return response.json();
}

async function fetchPlayerName(playerId, token) {
    const url = `https://api.battlemetrics.com/players/${playerId}?version=%5E0.1.0&access_token=${token}`;
    const response = await fetchWithRateLimit(url);
    if (!response.ok) return playerId;
    const json = await response.json();
    return json.data?.attributes?.name ?? playerId;
}

export async function getBMBannedAltsBulk(BMToken, relatedPlayers) {
    const results = [];
    for (const [playerId, matchCount] of relatedPlayers) {
        try {
            const banData = await fetchPlayerBans(playerId, BMToken);
            if (!banData?.data?.length) continue;

            const name = await fetchPlayerName(playerId, BMToken);
            results.push({ id: playerId, name, matchCount, banCount: banData.data.length });
        } catch (err) {
            if (err.message === "RATE_LIMIT") throw err;
            console.error(err);
        }
    }
    return results;
}
