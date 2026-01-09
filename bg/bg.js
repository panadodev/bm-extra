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
    if (req.type.startsWith("BME_RUST_API_FRIENDLIST")) return sendFriendlistFromRustApi(req.subject, req.apiKey, sender, returnObject)
    if (req.type.startsWith("BME_RUST_API_AVATARS")) return sendAvatarsFromRustApi(req.subject, req.apiKey, sender, returnObject)
    if (req.type.startsWith("BME_PREMIUM_STATUS")) return sendPremiumStatus(req.subject, sender, returnObject)
    if (req.type.startsWith("BME_PROXYCHECK")) return sendProxyCheck(req.subject, req.apiKey, sender, returnObject)
    if (req.type.startsWith("BME_PLAYER_SUMMARIES")) return sendSteamPlayerSummaries(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_BAN_SUMMARIES")) return sendSteamPlayerBanSummaries(req.subject, req.apiKey, sender, returnObject);
    if (req.type.startsWith("BME_PUBLIC_BANS")) return sendPublicBans(req.subject, req.apiKey, sender, returnObject);
})
function getSubjectOrItemCount(string) {
    if (string.startsWith("7656") && string.length === 17)
        return string;
    else
        return `Items: ${string.split(",").length}`;
}


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
async function sendFriendlistFromRustApi(steamId, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`https://rust-api.flqyd.dev/steamFriends/${steamId}?accessToken=${apiKey}`);
        if (resp?.status !== 200) throw new Error(`Requesting Rust Api Friends Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data.data.friends;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }

}
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
async function sendAvatarsFromRustApi(steamId, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`https://rust-api.flqyd.dev/getAvatars/${steamId}?accessToken=${apiKey}`);
        if (resp?.status !== 200) throw new Error(`Requesting Avatars Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data.data.avatars;
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
async function sendPublicBans(steamId, apiKey, sender, returnObject) {
    try {
        const resp = await fetch(`https://rust-api.flqyd.dev/bans/${steamId}?accessToken=${apiKey}`);
        if (resp?.status !== 200) throw new Error(`Requesting Public Bans Failed | steamId: ${steamId} | API KEY: ${apiKey.substring(0, 10)}... | Status: ${resp?.status}`)

        const data = await resp.json();
        returnObject.status = "OK";
        returnObject.value = data.data.bans;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    } catch (error) {
        console.error(error);
        returnObject.status = "ERROR";
        returnObject.value = error;
        return chrome.tabs.sendMessage(sender.tab.id, returnObject);
    }
}