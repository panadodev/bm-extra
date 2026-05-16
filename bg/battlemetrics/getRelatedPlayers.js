import { fetchWithRateLimit } from "../other/fetchWithRateLimit.js";

export async function getRelatedPlayers(BMToken, BMID, ignoreVpns = false) {
    try {
        const response = await fetchWithRateLimit(`https://api.battlemetrics.com/players/${BMID}/relationships/related-identifiers?version=%5E0.1.0`, {
            headers: { "Authorization": `Bearer ${BMToken}` }
        });
        if (!response.ok) return undefined;

        const data = await response.json();
        const relatedIDs = {};

        for (const identifier of data.data) {
            if (ignoreVpns && identifier.attributes?.type === "ip" && identifier.attributes?.metadata?.connectionInfo?.proxy === true) {
                continue;
            }

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
