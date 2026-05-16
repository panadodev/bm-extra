import { fetchWithRateLimit } from "../other/fetchWithRateLimit.js";
import { getRelativeTime } from "../other/getRelativeTime.js";

function getSteamIdentifier(included) {
    return included?.find(entry => entry.type === "identifier" && entry.attributes.type === "steamID") ?? null;
}

function hasEACBan(steamIdentifier) {
    return (steamIdentifier?.attributes?.metadata?.rustBans?.count ?? 0) > 0;
}

export async function getEACBannedAltsBulk(BMToken, relatedPlayers) {
    const bannedAlts = [];
    for (const [playerId, sharedCount] of relatedPlayers) {
        try {
            const url = `https://api.battlemetrics.com/players/${playerId}?include=identifier`;
            const response = await fetchWithRateLimit(url, { headers: { "Authorization": `Bearer ${BMToken}` } });
            if (!response.ok) continue;

            const json = await response.json();
            const steamId = getSteamIdentifier(json.included);
            if (!hasEACBan(steamId)) continue;

            const rustBans = steamId.attributes.metadata.rustBans;
            bannedAlts.push({
                id: playerId,
                name: json.data.attributes.name,
                sharedCount,
                relativeTime: getRelativeTime(new Date(rustBans.lastBan)),
                temp: !rustBans.banned,
            });
        } catch (err) {
            if (err.message === "RATE_LIMIT") throw err;
            console.error(err);
        }
    }
    return bannedAlts;
}
