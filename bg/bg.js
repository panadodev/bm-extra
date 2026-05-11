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
    if (req.type.startsWith("BME_PREMIUM_STATUS")) return sendPremiumStatus(req.subject, sender, returnObject)
    if (req.type.startsWith("BME_PROXYCHECK")) return sendProxyCheck(req.subject, req.apiKey, sender, returnObject)
    if (req.type.startsWith("BME_PLAYER_SUMMARIES")) return sendSteamPlayerSummaries(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_BAN_SUMMARIES")) return sendSteamPlayerBanSummaries(req.subject, req.apiKey, sender, returnObject);
    // if (req.type.startsWith("BME_PUBLIC_BANS")) return sendPublicBans(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_ATLAS_TEAMINFO")) return sendAtlasTeaminfo(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_WILLJUMS_TEAMINFO")) return sendWilljumsTeaminfo(req.subject, req.apiKey, sender, returnObject);

})


function downloadJsonFile(name, content) {
    const json = JSON.stringify(content, null, 4);
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

    chrome.downloads.download({
        url: dataUrl,
        filename: name,
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
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
// async function sendFriendlistFromRustApi(steamId, apiKey, sender, returnObject) {
//     try {
//         const resp = await fetch(``);
//         if (resp?.status !== 200) throw new Error(`Requesting Rust Api Friends Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

//         const data = await resp.json();
//         returnObject.status = "OK";
//         returnObject.value = data.data.friends;
//         return chrome.tabs.sendMessage(sender.tab.id, returnObject);
//     } catch (error) {
//         console.error(error);
//         returnObject.status = "ERROR";
//         returnObject.value = error;
//         return chrome.tabs.sendMessage(sender.tab.id, returnObject);
//     }

// }
async function sendPremiumStatus(steamId, sender, returnObject) {
    try {
        const resp = await fetch("https://rust-api.facepunch.com/api/premium/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: `{"SteamIds":[${steamId}]}`,
        });
        if (resp?.status !== 200) throw new Error(`Requesting premium status failed | steamId: ${steamId} | Status: ${resp?.status}`)

        const data = await resp.json();
        const value = { premium: data.Results[steamId] }

        returnObject.status = "OK";
        returnObject.value = value;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
async function sendProxyCheck(ips, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`http://proxycheck.io/v3/${ips}?key=${apiKey}`);
        if (resp?.status !== 200) throw new Error(`Requesting Proxycheck data failed | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();

        returnObject.status = "OK";
        returnObject.value = data;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

async function sendSteamPlayerSummaries(steamIds, API_KEY, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${steamIds}`);
        if (resp.status === 429) throw new Error("Rate Limit")
        if (resp?.status !== 200) throw new Error(`Requesting Steam Player Summaries Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

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
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
async function sendSteamPlayerBanSummaries(steamIds, API_KEY, sender, returnObject) {
    try {
        const resp = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${API_KEY}&steamids=${steamIds}`);
        if (resp.status === 429) throw new Error("Rate Limit")
        if (resp?.status !== 200) throw new Error(`Requesting Steam Ban Summaries Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status === "OK";
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
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}
// async function sendPublicBans(steamId, apiKey, sender, returnObject) {
//     try {
//         const resp = await fetch(`https://rust-api.flqyd.dev/bans/${steamId}?accessToken=${apiKey}`);
//         if (resp?.status !== 200) throw new Error(`Requesting Public Bans Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

//         const data = await resp.json();
//         returnObject.status = "OK";
//         returnObject.value = data.data.bans;
//         return chrome.tabs.sendMessage(sender.tab.id, returnObject);
//     } catch (error) {
//         console.error(error);
//         returnObject.status = "ERROR";
//         returnObject.value = error;
//         return chrome.tabs.sendMessage(sender.tab.id, returnObject);
//     }
// }
async function sendAtlasTeaminfo(values, apiKey, sender, returnObject) {
    try {        
        const steamId = values.split("-")[0];
        const serverId = values.split("-")[1];

        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
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
        if (resp?.status !== 200) throw new Error(`Requesting Atlas teaminfo failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
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

        const resp = await fetch(`${apiUrl}/${steamId}?server=${serverId}`, {
            method: "GET",
            headers: {
                "Authorization": apiKey
            }
        });

        if (resp?.status !== 200) throw new Error(`Requesting Willjums teaminfo failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`);

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}

chrome.runtime.onMessage.addListener(async (request, sender) => {
    if (request.type === "GetEACBannedAlts") {
        const relatedPlayers = await getRelatedPlayers(request.BMToken, request.BMID);
        if (relatedPlayers === undefined) return;

        chrome.tabs.sendMessage(sender.tab.id, {
            type: "GetEACBannedAlts",
            response: await getEACBannedAltsBulk(request.BMToken, relatedPlayers),
        });
    } else if (request.type === "GetBMBannedAlts") {
        const relatedPlayers = await getRelatedPlayers(request.BMToken, request.BMID);
        if (relatedPlayers === undefined) return;

        chrome.tabs.sendMessage(sender.tab.id, {
            type: "GetBMBannedAlts",
            response: await getBMBannedAltsBulk(request.BMToken, relatedPlayers),
        });
    }
});

async function getRelatedPlayers(BMToken, BMID) {
    try {
        const response = await fetch(`https://api.battlemetrics.com/players/${BMID}/relationships/related-identifiers?version=%5E0.1.0&access_token=${BMToken}`);
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
        console.error(error);
        return undefined;
    }
}

async function getEACBannedAltsBulk(BMToken, relatedPlayers) {
    const results = [];
    for (const [playerId, matchCount] of relatedPlayers) {
        try {
            const resp = await fetch(`https://api.battlemetrics.com/players/${playerId}?version=%5E0.1.0&include=identifier&access_token=${BMToken}`);
            if (!resp.ok) continue;

            const data = await resp.json();
            const identifiers = data.included || [];
            const hasEACBan = identifiers.some(id =>
                id.attributes?.type === "EAC" && id.attributes?.metadata?.ebanned === true
            );

            if (hasEACBan) {
                results.push({ id: playerId, name: data.data?.attributes?.name || playerId, matchCount });
            }
        } catch (error) {
            console.error(error);
        }
    }
    return results;
}

async function getBMBannedAltsBulk(BMToken, relatedPlayers) {
    const results = [];
    for (const [playerId, matchCount] of relatedPlayers) {
        try {
            const resp = await fetch(`https://api.battlemetrics.com/bans?version=%5E0.1.0&filter[player]=${playerId}&access_token=${BMToken}`);
            if (!resp.ok) continue;

            const data = await resp.json();
            if (!data.data?.length) continue;

            const playerResp = await fetch(`https://api.battlemetrics.com/players/${playerId}?version=%5E0.1.0&access_token=${BMToken}`);
            const playerData = playerResp.ok ? await playerResp.json() : null;

            results.push({
                id: playerId,
                name: playerData?.data?.attributes?.name || playerId,
                matchCount,
                banCount: data.data.length,
            });
        } catch (error) {
            console.error(error);
        }
    }
    return results;
}