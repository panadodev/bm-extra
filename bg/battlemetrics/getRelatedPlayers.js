import { fetchWithRateLimit } from "../other/fetchWithRateLimit.js";

export async function getRelatedPlayers(BMToken, BMID) {
    try {
        const response = await fetchWithRateLimit(`https://api.battlemetrics.com/players/${BMID}/relationships/related-identifiers?version=%5E0.1.0&access_token=${BMToken}`);
        if (!response.ok) return undefined;

        const data = await response.json();
        const relatedIDs = {};

        for (const identifier of data.data) {
            for (const relatedPlayer of identifier.relationships.relatedPlayers.data) {
                if (relatedIDs[relatedPlayer.id] === undefined) {
                    relatedIDs[relatedPlayer.id] = 1;
                } else {
                    relatedIDs[relatedPlayer.id]++;
                }
            }
        }

        const relatedPlayers = Object.entries(relatedIDs).sort((a, b) => b[1] - a[1]);
        if (relatedPlayers.length > 12) relatedPlayers.length = 12;
        return relatedPlayers;
    } catch (error) {
        if (error.message === "RATE_LIMIT") throw error;
        console.error(error);
        return undefined;
    }
}
