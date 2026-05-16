import { getBMBannedAltsBulk } from './battlemetrics/getBMBannedAltsBulk.js';
import { getRelatedPlayers } from './battlemetrics/getRelatedPlayers.js';
import { bmRateLimitMax, bmRateLimitRemaining, fetchWithRateLimit } from './other/fetchWithRateLimit.js';

console.log("Service worker loaded!")

/**
 * apiKey - API KEY REGARDLESS OF THE SERVICE
 * subject - steam ID, IP
 */
chrome.runtime.onMessage.addListener(async (req, sender) => {
    if (!req.type.startsWith("BME_")) return;
    if (req.type === "BME_JSON_DOWNLOAD") return downloadJsonFile(req.filename, req.data)

    console.log(`${req.type.padEnd(30)} | ${`${req?.apiKey?.substring(0, 10)}`.padEnd(10)} | ${req.subject.length === 17 ? req.subject : req.subject.split(",").length}`);
    /**
     * returnObject:
     * type: original type +"_RESOLVED"
     * status: "OK" | "ERROR"
     * value: the outcome of the request or the error object
     */
    const returnObject = { type: `${req.type}_RESOLVED` }
    if (req.type.startsWith("BME_STEAM_FRIENDLIST")) return sendFriendlistFromSteam(req.subject, req.apiKey, sender, returnObject);
    // if (req.type.startsWith("BME_RUST_API_FRIENDLIST")) return sendFriendlistFromRustApi(req.subject, req.apiKey, sender, returnObject)
    // if (req.type.startsWith("BME_RUST_API_AVATARS")) return sendAvatarsFromRustApi(req.subject, req.apiKey, sender, returnObject)
    if (req.type.startsWith("BME_PROXYCHECK")) return sendProxyCheck(req.subject, req.apiKey, sender, returnObject)
    if (req.type.startsWith("BME_PLAYER_SUMMARIES")) return sendSteamPlayerSummaries(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_BAN_SUMMARIES")) return sendSteamPlayerBanSummaries(req.subject, req.apiKey, sender, returnObject);
    // if (req.type.startsWith("BME_PUBLIC_BANS")) return sendPublicBans(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_ATLAS_TEAMINFO")) return sendAtlasTeaminfo(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_WILLJUMS_TEAMINFO")) return sendWilljumsTeaminfo(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_BM_ALTS")) return sendBmBannedAlts(req.subject, req.apiKey, req.ignoreVpns ?? false, sender, returnObject);
    if (req.type.startsWith("BME_EAC_ALTS")) return sendEacBannedAlts(req.subject, req.apiKey, req.ignoreVpns ?? false, sender, returnObject);
    if (req.type.startsWith("BME_BM_PING")) return sendBmPing(req.subject, req.apiKey, sender, returnObject);

})


function downloadJsonFile(name, content) {
    const json = JSON.stringify(content, null, 4);
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

    const sanitized = String(name ?? "")
        .replace(/[\/\\?%*:|"<>\x00-\x1f]/g, "_")
        .replace(/\.{2,}/g, "_")
        .replace(/^[.\s]+|[.\s]+$/g, "");
    const safeName = sanitized || "download.json";

    chrome.downloads.download({
        url: dataUrl,
        filename: safeName,
        saveAs: true,
    });
}
async function sendFriendlistFromSteam(steamId, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${apiKey}&steamid=${steamId}&relationship=friend`);
        if (resp?.status !== 200 && resp.status !== 401) throw new Error(`Requesting Steam Friends Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        if (resp.status === 401) {
            returnObject.value = "Private";
        } else {
            returnObject.value = data.friendslist.friends.map(item => {
                return {
                    steamId: item.steamid,
                    since: item.friend_since,
                }
            })
        }
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

async function sendProxyCheck(ips, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`https://proxycheck.io/v3/${ips}?key=${apiKey}`);
        if (resp?.status !== 200) throw new Error(`Requesting Proxycheck data failed | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();

        returnObject.status = "OK";
        returnObject.value = data;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

async function sendSteamPlayerSummaries(steamIds, API_KEY, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${steamIds}`);
        if (resp.status === 429) throw new Error("Rate Limit")
        if (resp?.status !== 200) throw new Error(`Requesting Steam Player Summaries Failed | steamIds: ${steamIds} | API KEY: ${API_KEY.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data.response.players.map(item => {
            return {
                steamId: item.steamid,
                name: item.personaname,
                avatar: item.avatarhash,
                online: item.personastate,
                inGame: item.gameextrainfo ? item.gameextrainfo : "Not playing",
                setup: item.profilestate ? true : false,
            }
        });
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
async function sendSteamPlayerBanSummaries(steamIds, API_KEY, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${API_KEY}&steamids=${steamIds}`);
        if (resp.status === 429) throw new Error("Rate Limit")
        if (resp?.status !== 200) throw new Error(`Requesting Steam Ban Summaries Failed | steamIds: ${steamIds} | API KEY: ${API_KEY.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data.players.map(item => {
            return {
                steamId: item.SteamId,
                daysSinceLastBan: item.DaysSinceLastBan,
                gameBanCount: item.NumberOfGameBans,
                vacBanCount: item.NumberOfVACBans,
                vacBanStatus: item.VACBanned,
            }
        })
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

async function sendAtlasTeaminfo(values, apiKey, sender, returnObject) {
    try {        
        const steamId = values.split("-")[0];
        const serverId = values.split("-")[1];

        const resp = await fetchWithRateLimit(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        command: "c46e957a-54d8-497c-81ec-c2dcef2cd7e2",
                        options: {
                            player: steamId,
                        }
                    },
                    type: "rconCommand"
                }
            })
        })
        if (resp?.status !== 200) {
            console.error(`Requesting Atlas teaminfo failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`);
            throw new Error(String(resp.status));
        }

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data;
        returnObject.rateLimitRemaining = bmRateLimitRemaining;
        returnObject.rateLimitMax = bmRateLimitMax;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

async function sendWilljumsTeaminfo(values, apiKey, sender, returnObject) {
    try {
        const parts = values.split("-");
        const steamId = parts[0];
        const serverId = parts[1];
        const apiUrl = parts.slice(2).join("-"); // In case URL contains dashes

        try {
            if (new URL(apiUrl).protocol !== "https:") throw new Error("scheme");
        } catch {
            throw new Error("Willjums API URL must be https");
        }

        const resp = await fetch(`${apiUrl}/${steamId}?server=${serverId}`, {
            method: "GET",
            headers: {
                "Authorization": apiKey
            }
        });

        if (resp?.status !== 200) {
            console.error(`Requesting Willjums teaminfo failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`);
            throw new Error(String(resp.status));
        }

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

async function sendBmPing(bmId, apiKey, sender, returnObject) {
    try {
        await fetchWithRateLimit(`https://api.battlemetrics.com/players/${bmId}`, {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });
        returnObject.status = "OK";
        returnObject.value = null;
        returnObject.rateLimitRemaining = bmRateLimitRemaining;
        returnObject.rateLimitMax = bmRateLimitMax;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

chrome.runtime.onMessage.addListener(async (request, sender) => {
    if (request.type === "GetBMBannedAlts") {
        const relatedPlayers = await getRelatedPlayers(request.BMToken, request.BMID);
        if (relatedPlayers === undefined) return;

        chrome.tabs.sendMessage(sender.tab.id, {
            type: "GetBMBannedAlts",
            response: await getBMBannedAltsBulk(request.BMToken, relatedPlayers),
        });
    }
});

async function sendBmBannedAlts(bmId, BMToken, ignoreVpns, sender, returnObject) {
    try {
        const relatedPlayers = await getRelatedPlayers(BMToken, bmId, ignoreVpns);
        if (!relatedPlayers) throw new Error("Failed to fetch related players");

        const total = relatedPlayers.length;
        const progressType = returnObject.type.replace("_RESOLVED", "_PROGRESS");
        const results = [];

        const authHeader = { "Authorization": `Bearer ${BMToken}` };
        for (let i = 0; i < relatedPlayers.length; i++) {
            const [playerId, matchCount] = relatedPlayers[i];
            try {
                const resp = await fetchWithRateLimit(`https://api.battlemetrics.com/bans?version=%5E0.1.0&filter[player]=${playerId}`, { headers: authHeader });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.data?.length) {
                        const playerResp = await fetchWithRateLimit(`https://api.battlemetrics.com/players/${playerId}?version=%5E0.1.0`, { headers: authHeader });
                        const playerData = playerResp.ok ? await playerResp.json() : null;

                        results.push({
                            id: playerId,
                            name: playerData?.data?.attributes?.name || playerId,
                            matchCount,
                            banCount: data.data.length,
                        });
                    }
                }
            } catch (error) {
                if (error.message === "RATE_LIMIT") throw error;
                console.error(error);
            }
            chrome.tabs.sendMessage(sender.tab.id, { type: progressType, current: i + 1, total, rateLimitRemaining: bmRateLimitRemaining, rateLimitMax: bmRateLimitMax });
        }

        returnObject.status = "OK";
        returnObject.value = results;
        returnObject.rateLimitRemaining = bmRateLimitRemaining;
        returnObject.rateLimitMax = bmRateLimitMax;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
async function sendEacBannedAlts(bmId, BMToken, ignoreVpns, sender, returnObject) {
    try {
        const relatedPlayers = await getRelatedPlayers(BMToken, bmId, ignoreVpns);
        if (!relatedPlayers) throw new Error("Failed to fetch related players");

        const total = relatedPlayers.length;
        const progressType = returnObject.type.replace("_RESOLVED", "_PROGRESS");
        const bannedAlts = [];

        for (let i = 0; i < relatedPlayers.length; i++) {
            const [playerId, sharedCount] = relatedPlayers[i];
            try {
                const resp = await fetchWithRateLimit(`https://api.battlemetrics.com/players/${playerId}?include=identifier`, {
                    headers: { "Authorization": `Bearer ${BMToken}` }
                });
                if (!resp.ok) continue;

                const data = await resp.json();
                const steamIdentifier = data.included?.find(
                    i => i.type === "identifier" && i.attributes.type === "steamID"
                );

                if (steamIdentifier?.attributes?.metadata?.rustBans?.count > 0) {
                    bannedAlts.push({
                        id: playerId,
                        name: data.data?.attributes?.name || playerId,
                        sharedCount,
                        lastBan: steamIdentifier.attributes.metadata.rustBans.lastBan ?? null,
                        temp: steamIdentifier.attributes.metadata.rustBans.banned ? false : true,
                    });
                }
            } catch (error) {
                if (error.message === "RATE_LIMIT") throw error;
                console.error(error);
            }
            chrome.tabs.sendMessage(sender.tab.id, { type: progressType, current: i + 1, total, rateLimitRemaining: bmRateLimitRemaining, rateLimitMax: bmRateLimitMax });
        }

        returnObject.status = "OK";
        returnObject.value = bannedAlts;
        returnObject.rateLimitRemaining = bmRateLimitRemaining;
        returnObject.rateLimitMax = bmRateLimitMax;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.message = error.message;
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}