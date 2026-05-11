import { getElementWhenAppears, getSteamIdObject, getTimeSpan, shouldAbort } from "../../misc.js";
import { getInfoPanel } from "./getInfoPanel.js";

export async function displayServerActivity(bmId, bmProfile) {
    bmProfile = await bmProfile;

    const servers = bmProfile.included
        .filter(item => item.type === "server")
        .map(server => {
            return {
                id: server.id,
                name: server.attributes.name,
                online: server.meta.online,
                ip: `${server.attributes.ip}:${server.attributes.port}`,
                pop: {
                    max: server.attributes.maxPlayers,
                    current: server.attributes.players,
                },
                lastSeen: new Date(server.meta.lastSeen).getTime(),
            }
        })
        .sort((a, b) => b.lastSeen - a.lastSeen);

    const onlineServers = servers.filter(server => server.online);

    const rconElement = await getElementWhenAppears("RCONPlayerPage");
    
    const title = rconElement?.firstChild;
    if (!title) return console.error("BM-EXTRA: Failed to setup serverElement.")
    const serverElement = getCurrentServersElement(onlineServers.length ? onlineServers : [servers[0]]);
    
    serverElement.id = "bme-server-panel"
    if (!serverElement) return console.error("BM-EXTRA: serverElement failed to assemble.")

    if (shouldAbort(bmId, "bme-server-panel")) return;
    title.insertAdjacentElement("afterend", serverElement);
}
function getCurrentServersElement(servers) {    
    const element = document.createElement("div");
    for (const server of servers) {
        if (!server.online && !element.classList.contains("offline"))
            element.classList.add("offline");

        const firstLine = document.createElement("p");
        const prefix = server.online ? "Current server" : "Last server";
        firstLine.innerHTML = `${prefix}: <a href="https://www.battlemetrics.com/rcon/servers/${server.id}" target="_blank">${server.name}</a> (${server.pop.current}/${server.pop.max})`
        element.appendChild(firstLine);

        const secondLine = document.createElement("p");
        secondLine.innerHTML = `${server.online ? "Joined" : "Last seen: "}: ${getTimeSpan(server.lastSeen)} ago`
        element.appendChild(secondLine)

        const thirdLine = document.createElement("div");
        element.appendChild(thirdLine);

        const ipText = document.createElement("p");
        ipText.innerText = `IP: ${server.ip}`;
        thirdLine.appendChild(ipText);

        const copyImg = document.createElement("img");
        if (server.online) copyImg.src = chrome.runtime.getURL('assets/img/copy.png');
        else copyImg.src = chrome.runtime.getURL('assets/img/copy-gray.png');
        copyImg.addEventListener("click", () => {
            try {
                navigator.clipboard.writeText(`connect ${server.ip}`)
            } catch (error) { console.error(`BM-EXTRA: ${error}`); }
        })
        thirdLine.appendChild(copyImg);
    }
    return element;
}

export async function displayInfoPanel(bmId, bmProfile, steamData, bmActivity, rustPremium) {
    bmProfile = await bmProfile;
    steamData = await steamData;
    bmActivity = await bmActivity;
    rustPremium = await rustPremium;

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const bmSteamData = getSteamData(steamIdObject, steamData);
    const bmData = getBmData(bmId, bmProfile, bmActivity);

    const rconElement = await getElementWhenAppears("RCONPlayerPage");
    const allTheDivs = rconElement.lastChild.firstChild;
    let identifierDiv;
    for (const div of allTheDivs.childNodes) {
        if (div.firstChild.innerText.trim() === "Identifiers") {
            identifierDiv = div;
            break;
        }
    }

    if (!identifierDiv) return;

    const infoPanel = getInfoPanel(bmSteamData, bmData, rustPremium, bmId);
    infoPanel.id = "bme-info-panel";

    if (shouldAbort(bmId, "bme-info-panel")) return;
    identifierDiv.insertAdjacentElement("afterend", infoPanel)
}
function getSteamData(steamIdObject, steamData) {
    if (!steamIdObject) return null;
    const returnData = {}
    returnData.steamId = steamIdObject.attributes?.identifier;

    const metadata = steamIdObject.attributes?.metadata;

    returnData.gameBanCount = metadata?.bans ? metadata.bans.NumberOfGameBans : null;
    returnData.vacBanCount = metadata?.bans ? metadata.bans.NumberOfVACBans : null;
    returnData.daysSinceLastBan = metadata?.bans ? metadata.bans.DaysSinceLastBan : null;
    returnData.vacBanStatus = metadata?.bans ? metadata.bans.VACBanned : null;
    returnData.communityBanned = metadata?.bans ? metadata.bans.CommunityBanned : null;

    if (metadata?.gameInfo && metadata.gameInfo.game_count > 0) {
        const hoursPlayed = metadata.gameInfo.games.map(game => game.playtime_forever);

        returnData.gameCount = metadata.gameInfo.game_count;
        returnData.steamHours = 0;
        hoursPlayed.forEach(playtime => { returnData.steamHours += playtime });
        returnData.steamHours = Math.floor(returnData.steamHours / 60);

        const rustHours = metadata.gameInfo.games.filter(game => game.appid === 252490)[0];
        returnData.rustHours = rustHours ? Math.floor(rustHours.playtime_forever / 60) : null;
        returnData.gamesLastChecked = metadata.gameInfo.lastCheck ? new Date(metadata.gameInfo.lastCheck).getTime() : null;
    } else {
        returnData.gameCount = null;
        returnData.steamHours = null;
        returnData.rustHours = null;
        returnData.gamesLastChecked = null;
    }

    returnData.visibility = metadata?.profile ? metadata.profile.communityvisibilitystate : null;
    returnData.limitedAccount = typeof (metadata?.profile?.isLimitedAccount) === "boolean" ? metadata.profile.isLimitedAccount : null;
    returnData.isSetup = metadata?.profile ? metadata.profile.profilestate ? true : false : null;
    returnData.accountAge = steamData ? steamData.data.memberSince ?
        new Date(steamData.data.attributes.memberSince).getTime() :
        new Date(steamData.data.attributes.memberSinceAprox).getTime() : null;

    return returnData;
}
function getBmData(bmId, bmData, bmActivity) {
    const returnData = {};
    returnData.accountAge = new Date(bmData.data.attributes.createdAt).getTime();
    returnData.private = bmData.data.attributes.private;

    const servers = bmData.included.filter(item => item.type === "server");

    returnData.numberOfServer = servers.length;

    returnData.combinedPlaytime = 0;
    returnData.aimTrainPlaytime = 0;

    servers.forEach(server => {
        const timePlayed = server.meta.timePlayed;
        returnData.combinedPlaytime += timePlayed;
        if (isAimTrainingServer(server))
            returnData.aimTrainPlaytime += timePlayed;
    })
    returnData.combinedPlaytime = Math.floor(returnData.combinedPlaytime / 60 / 60);
    returnData.aimTrainPlaytime = Math.floor(returnData.aimTrainPlaytime / 60 / 60);

    returnData.allReports = [];
    returnData.cheatReports = [];
    returnData.kills = [];
    returnData.deaths = [];

    bmActivity.data.forEach(msg => {
        if (msg.type !== "activityMessage" || !msg.attributes) return;
        const data = msg.attributes.data;
        const timestamp = new Date(msg.attributes.timestamp).getTime();

        if (msg.attributes.messageType === "rustLog:playerReport" && bmId == data.forPlayerId) { //REPORT
            returnData.allReports.push(timestamp);
            if (data.reportType === "cheat") returnData.cheatReports.push(timestamp);
        }
        if (msg.attributes.messageType === "rustLog:playerDeath:PVP" && bmId == data.killer_id) { //KILL
            returnData.kills.push(timestamp);
        }
        if (msg.attributes.messageType === "rustLog:playerDeath:PVP" && bmId != data.killer_id) { //KILL
            returnData.deaths.push(timestamp);
        }
    })
    return returnData;
}
function isAimTrainingServer(server) {
    const serverName = server.attributes.name;
    if (serverName.includes("UKN")) return true;
    if (serverName.includes("Aim Training")) return true;

    return false;
}

export async function removeSteamInformation(bmId) {
    const link = await getElementWhenAppears("links", true);

    let parent = link.parentNode;
    while (parent) {
        const title = parent.firstChild?.firstChild?.innerText?.trim();
        if (title === "Steam Information") return parent.remove();

        parent = parent.parentNode;
        await new Promise(r => { setTimeout(r, 100); })
    }
    console.error(`BM-EXTRA: Failed to locate steam info.`);
}

export async function closeAdminLog(bmId) {
    const rconElement = await getElementWhenAppears("RCONPlayerPage");
    const divs = rconElement?.lastChild?.firstChild?.childNodes;

    for (const div of divs) {
        const title = div?.firstChild?.firstChild?.innerText?.trim();
        if (title !== "Admin Log") continue;

        div.firstChild.click();
    }
}

export async function limitItem(bmId, limit, item) {
    const identifierWrapper = (await getElementWhenAppears("css-11gv980", true));
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) return console.error("BM-EXTRA: identifierTable is missing!")

    let count = 0;
    for (const identifier of identifierTable) {
        const type = identifier?.children[1]?.firstChild?.innerText;
        if (type !== item) continue;

        count++;
        if (count <= limit) continue;
        if (shouldAbort(bmId, null, "overview")) return;
        identifier.classList.add("bme-hidden");
    }
}

export async function hideIpOnProfile(bmId) {
    const identifierWrapper = (await getElementWhenAppears("css-11gv980", true));
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) return console.error("BM-EXTRA: identifierTable is missing!");

    for (const identifier of identifierTable) {
        const type = identifier?.children[1]?.firstChild?.innerText;
        if (type !== "IP") continue;
        if (shouldAbort(bmId, null, "overview")) return;
        const ipEl = identifier.querySelector(".css-q39y9k");
        if (ipEl) ipEl.style.visibility = "hidden";
    }
}

export async function advancedBans(bmId, banDataP) {
    const banData = await banDataP

    const rconElement = await getElementWhenAppears("RCONPlayerPage");
    const sections = rconElement?.lastChild?.firstChild?.childNodes;
    if (!sections) console.error("BM-EXTRA: Failed to find sections.");

    let banSection = null;
    for (const section of sections) {
        if (section.firstChild.innerText.trim() !== "Current & Past bans") continue;
        banSection = section;
        break;
    }

    if (!banSection) return console.error("BM-EXTRA: Failed to locate ban section.");
    const banList = banSection.lastChild?.firstChild?.childNodes;
    if (!banList) return console.error("BM-EXTRA: Failed to locate ban list.");

    const urlId = location.href.split("/")[5];
    if (urlId !== bmId) return true; //Page changed | Abort
    for (const banElement of banList) {
        const banId = banElement.firstChild.href.split("/")[6];
        const banSpan = banElement.firstChild.firstChild;

        const banItem = getBanItem(banData, banId);
        if (!banItem || !banSpan) continue;

        convertBanSpan(banItem, banSpan);
    }
}
function convertBanSpan(ban, span) {
    const banReason = ban.attributes.reason.split(" - ")[0];
    const timestamp = new Date(ban.attributes.timestamp).getTime();

    const expiration = ban.attributes.expires === null ? 0 : new Date(ban.attributes.expires).getTime();
    const active = expiration === 0 ? true : Date.now() < expiration;
    const length = expiration === 0 ? 0 : expiration - timestamp;

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const lengthText = length === 0 ? `Permanent` : `${Math.round(length / ONE_DAY * 10) / 10} days`;
    const lengthString = active ? `<b>${lengthText}</b>` : `${lengthText}`;

    const stringArray = [
        `${getTimeSpan(timestamp)} ago`,
        `<b>${banReason}</b>`,
        `${active === true ? "<b>Active</b>" : "Expired"}`,
        lengthString
    ]
    span.innerHTML = `${stringArray.join("&nbsp;&nbsp;|&nbsp;&nbsp;")}`;
}
function getBanItem(banData, banId) {
    for (const ban of banData.data)
        if (ban.id === banId) return ban;
    return null;
}

export async function displayAlertLink(bmId) {
    const navbar = (await getElementWhenAppears("container", true))?.children[1]?.children;
    if (!navbar) return console.error(`BM-EXTRA: Failed to locate navbar!`);
    for (const navElement of navbar) {
        if (navElement.innerText.trim() !== "Ban Player") continue
        const link = document.createElement("li");
        link.classList.add("bme-alert-element")
        link.innerHTML = `
        <a href="/alerts/add?player=${bmId}" target="_blank">
            <img class="bme-alert-icon" src="${chrome.runtime.getURL("assets/img/add-alert.png")}">
            <p>Add Alert</p>
        </a>`;
        navElement.before(link);
        return;
    }
    console.error(`BM-EXTRA: Failed to display alert link.`);
}