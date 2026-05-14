import { getTimeSpan } from "../../misc.js";

export function getInfoPanel(bmSteamData, bmData, rustPremium, bmId) {
    const element = document.createElement("div");

    const header = document.createElement("div");
    header.classList.add("bme-section-header")
    header.addEventListener("click", e => {
        const body = document.getElementsByClassName("bme-section-body")[0];
        const arrow = document.getElementById("bme-info-panel-arrow");

        arrow.classList.toggle("closed");
        body.classList.toggle("bme-panel-closed");
    })
    element.appendChild(header);

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL('assets/img/arrow.png');
    img.id = "bme-info-panel-arrow";
    header.appendChild(img);

    const title = document.createElement("h2");
    title.innerText = "BM Information";
    header.appendChild(title);

    const body = document.createElement("div");
    body.classList.add("bme-section-body");
    element.appendChild(body);

    body.appendChild(getSteamInfoPanel(bmSteamData, rustPremium));
    body.appendChild(getBmInfoPanel(bmData, bmId));

    return element;
}


function getSteamInfoPanel(steam, rustPremium) {
    const settings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"))
    const element = document.createElement("div");

    const title = document.createElement("a");
    title.target = "_blank";
    if (steam?.steamId) title.href = `https://steamcommunity.com/profiles/${steam.steamId}`
    title.classList.add("bme-info-title");
    title.innerText = "Steam Profile:";
    element.appendChild(title);

    const list = document.createElement("dl");
    list.classList.add("css-h1lc4m");
    element.appendChild(list);

    const items = [];
    items.push(...getSteamAccountAgeElements(steam, settings.steamAccountAgeColors))
    items.push(...getVisibilityElements(steam))
    items.push(...getSetupStateElements(steam));
    items.push(...getLimitedAccountElements(steam));
    items.push(...getPremiumStateElement(rustPremium));
    items.push(createSeparator());
    items.push(...getGameBanCountElements(steam));
    items.push(...getVacBanCountElements(steam));
    items.push(...getDaysSinceElements(steam));

    const isHistoric = steam?.gamesLastChecked ? Date.now() - steam.gamesLastChecked > 7 * ONE_DAY : null;
    items.push(createSeparator());
    items.push(...getSteamRustHoursElements(steam, settings.steamRustHoursColors, isHistoric));
    items.push(...getSteamCombinedHoursElements(steam, settings.steamCombinedHoursColors, isHistoric));
    items.push(...getSteamGameCountElements(steam, settings.steamGameCountColors, isHistoric));
    if (isHistoric) items.push(...getHistoricTimestampElements(steam, settings.gamesLastCheckedColors))
    items.push(...getSteamIdComElements(steam));
    for (const item of items) list.appendChild(item);


    return element;
}
function getSteamAccountAgeElements(steam, settings) {
    const title = createHtmlElement("dt", "Account Age:");

    const valueString = steam?.accountAge ? getTimeSpan(steam.accountAge) : "Unknown";

    let currentClass = steam?.accountAge ? getAscendingClassString(settings, [Date.now() - steam.accountAge], settings[3]) : null
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getVisibilityElements(steam) {
    const title = createHtmlElement("dt", "Visibility:");

    const valueString = !steam || steam.visibility === null ? "Unknown" : steam.visibility === 1 ? "Private" : "Public";
    const value = createHtmlElement("dd", valueString, []);
    return [title, value];

}
function getSetupStateElements(steam) {
    const title = createHtmlElement("dt", "Setup:");

    const valueString = !steam || steam.isSetup === null ? "Unknown" : steam.isSetup;
    const currentClass = steam && steam.isSetup === false ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getPremiumStateElement(rustPremium) {
    const title = createHtmlElement("dt", "Premium:");

    const valueString = rustPremium === null ? "Unknown" : rustPremium;
    const currentClass = rustPremium === null ? null : rustPremium ? "bme-green-text" : "bme-red-text";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}

function getLimitedAccountElements(steam) {
    const title = createHtmlElement("dt", "Limited:");

    const valueString = !steam || steam.limitedAccount === null ? "Unknown" : steam.limitedAccount;
    const currentClass = steam && steam.limitedAccount ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getGameBanCountElements(steam) {
    const title = createHtmlElement("dt", "Game Bans:");

    const valueString = !steam || steam.vacBanCount === null ? "Unknown" : `${steam.vacBanCount}`;

    const currentClass = steam && (steam.vacBanCount > 0 && steam.daysSinceLastBan < 180) ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getVacBanCountElements(steam) {
    const title = createHtmlElement("dt", "VAC Bans:");

    const valueString = !steam || steam.vacBanCount === null ? "Unknown" : `${steam.vacBanCount}`;

    const currentClass = steam && (steam.vacBanCount > 0 && steam.daysSinceLastBan < 180) ? "bme-red-text" : "";
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getDaysSinceElements(steam) {
    const title = createHtmlElement("dt", "Last ban:");

    const valueString = !steam || steam.daysSinceLastBan === null ? "Unknown" : `${steam.daysSinceLastBan} days`;

    const banCount = !steam || steam.vacBanCount === null || steam.gameBanCount === null ? 0 : steam.vacBanCount + steam.gameBanCount;
    const currentClass = banCount === 0 ? "" : steam.daysSinceLastBan > 180 ? "" : "bme-red-text";

    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];

}
function getSteamGameCountElements(steam, settings, isHistoric) {
    const title = createHtmlElement("dt", "Game Count:");

    const valueString = !steam || steam.gameCount === null ? "Unknown" : steam.gameCount;
    const currentClass = !steam || steam.gameCount === null ? "" : getAscendingClassString(settings, [steam.gameCount], settings[3]);

    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);

    if (isHistoric) {
        title.classList.add("bme-highlight");
        value.classList.add("bme-highlight");
    }
    return [title, value];
}
function getSteamCombinedHoursElements(steam, settings, isHistoric) {
    const title = createHtmlElement("dt", "Steam Hours:");

    const valueString = !steam || steam.steamHours === null ? "Unknown" : steam.gameCount && steam.steamHours === 0 ? "Private" : `${steam.steamHours} hours`;

    const currentClass = !steam || steam.steamHours === null || (steam.gameCount && steam.steamHours === 0) ?
        "" :
        getAscendingClassString(settings, [steam.steamHours], settings[3]);
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);

    if (isHistoric) {
        title.classList.add("bme-highlight");
        value.classList.add("bme-highlight");
    }
    return [title, value];
}
function getSteamRustHoursElements(steam, settings, isHistoric) {    
    const title = createHtmlElement("dt", "Rust Hours:");
    
    const valueString = !steam || steam.rustHours === null ? "Unknown" : steam.gameCount && steam.rustHours === 0 ? "Private" : `${steam.rustHours} hours`;

    let currentClass = !steam || steam.rustHours === null || (steam.gameCount && steam.rustHours === 0) ?
        "" :
        getAscendingClassString(settings, [steam.rustHours], settings[3]);
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);

    if (isHistoric) {
        title.classList.add("bme-highlight");
        value.classList.add("bme-highlight");
    }
    
    return [title, value];
}
function getHistoricTimestampElements(steam, settings) {
    const title = createHtmlElement("dt", "Last Recorded:");
    title.classList.add("bme-highlight");
    
    const valueString = getTimeSpan(steam.gamesLastChecked)+" ago";

    const since = Date.now() - steam.gamesLastChecked;
    let currentClass = getAscendingClassString(settings, [since], settings[3]);
    
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    value.classList.add("bme-highlight");
    return [title, value];
}



function getSteamIdComElements(steam) {
    const title = createHtmlElement("dt", "SteamID.com:");

    if (!steam?.steamId) {
        const value = createHtmlElement("dd", "Unknown");
        return [title, value];
    }

    const value = document.createElement("dd");
    const img = document.createElement("img");
    img.width = 16;
    img.height = 16;
    img.src = "https://cdn.battlemetrics.com/app/assets/steamid.0607f.svg";
    const link = document.createElement("a");
    link.href = `https://www.steamid.com/profiles/${steam.steamId}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerText = "SteamID.com";
    value.appendChild(img);
    value.appendChild(document.createTextNode(" "));
    value.appendChild(link);
    return [title, value];
}

function getBmInfoPanel(bm, bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_BM_INFO_SETTINGS"))
    const element = document.createElement("div");

    const title = document.createElement("p");
    title.classList.add("bme-info-title");
    title.innerText = "BattleMetrics:";
    element.appendChild(title);

    const list = document.createElement("div");
    list.classList.add("css-h1lc4m");
    element.appendChild(list)

    const items = [];
    items.push(...getAccountAgeElements(bm, settings.bmAccountAgeColors))
    items.push(...getBmAccountStatus(bm))
    items.push(createSeparator());
    items.push(...getKillCountElements(bm, settings.killColors, settings.killBarrier));
    items.push(...getDeathElements(bm, settings.deathColors, settings.deathBarrier));
    items.push(...getKdElements(bm, settings.kdColors, settings.kdBarrier));
    items.push(createSeparator());
    items.push(...getReportElements(bm, settings.allReportsColor, settings.allReportsBarrier))
    items.push(...getCheatReportElements(bm, settings.cheatReportsColors, settings.cheatReportsBarrier))
    items.push(createSeparator());
    items.push(...getServerCountElements(bm, settings.serverCountColors))
    items.push(...getBmRustHoursElements(bm, settings.bmRustHoursColors))
    items.push(...getYourServersHoursElements(bm, settings.yourServersHoursColors))
    items.push(...getAimTrainingElements(bm, settings.aimTrainColors));
    items.push(createSeparator());

    const bmAltTitle = createHtmlElement("dt", "BM Banned Alts:");
    const bmAltValue = createHtmlElement("dd", "");
    const bmAltButton = createHtmlElement("a", "Click to check");
    bmAltButton.style.cursor = "pointer";
    bmAltValue.appendChild(bmAltButton);
    bmAltButton.onclick = async () => {
        const BMToken = localStorage.getItem("BME_BATTLEMETRICS_API_KEY");
        if (!BMToken) { bmAltValue.innerText = "No API key"; return; }
        try {
            const results = await checkAltsWithProgress("BME_BM_ALTS", bmId, BMToken, bmAltValue);
            renderAltCheckResults(bmAltValue, results);
        } catch { bmAltValue.innerText = "Error"; }
    };
    items.push(bmAltTitle, bmAltValue);

    const eacAltTitle = createHtmlElement("dt", "EAC Banned Alts:");
    const eacAltValue = createHtmlElement("dd", "");
    const eacAltButton = createHtmlElement("a", "Click to check");
    eacAltButton.style.cursor = "pointer";
    eacAltValue.appendChild(eacAltButton);
    eacAltButton.onclick = async () => {
        const BMToken = localStorage.getItem("BME_BATTLEMETRICS_API_KEY");
        if (!BMToken) { eacAltValue.innerText = "No API key"; return; }
        try {
            const results = await checkAltsWithProgress("BME_EAC_ALTS", bmId, BMToken, eacAltValue);
            renderAltCheckResults(eacAltValue, results);
        } catch { eacAltValue.innerText = "Error"; }
    };
    items.push(eacAltTitle, eacAltValue);

    for (const item of items) list.appendChild(item);

    return element;
}
function getAccountAgeElements(bm, settings) {
    const title = createHtmlElement("dt", "Account Age:");

    const valueString = bm.accountAge ? getTimeSpan(bm.accountAge) : "Unknown";

    let currentClass = bm.accountAge ? getAscendingClassString(settings, [Date.now() - bm.accountAge], settings[3]) : [];
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getBmAccountStatus(bm) {
    const title = createHtmlElement("dt", "Private:");

    const value = createHtmlElement("dd", `${typeof (bm.private) === "boolean" ? bm.private : "Unknown"}`, bm.private ? ["bme-red-text"] : []);
    return [title, value];
}
function getServerCountElements(bm, settings) {
    const title = createHtmlElement("dt", "Server Count:");

    let currentClass = getAscendingClassString(settings, [bm.numberOfServer], settings[3])
    const value = createHtmlElement("dd", `${bm.numberOfServer}`, currentClass ? [currentClass] : []);
    return [title, value];
}
function getReportElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Reports:");

    const reportCount = bm.allReports.length
    let valueString = "" + reportCount;

    let recentReportCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentReportCount = bm.allReports.filter(report => report > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        valueString += ` (${recentReportCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [reportCount, recentReportCount], settings[3]);
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getCheatReportElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Cheat Reports:");

    const reportCount = bm.cheatReports.length
    let valueString = "" + reportCount;

    let recentReportCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentReportCount = bm.cheatReports.filter(report => report > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        valueString += ` (${recentReportCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [reportCount, recentReportCount], settings[3])
    const value = createHtmlElement("dd", valueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getYourServersHoursElements(bm, settings) {
    const myServers = JSON.parse(localStorage.getItem("BME_MY_SERVERS")) || [];
    if (!myServers.some(s => s.enabled)) return [];

    const title = createHtmlElement("dt", "Your Servers:");
    const colorSettings = settings || [-1, -1, -1, false];
    let currentClass = getAscendingClassString(colorSettings, [bm.yourServersPlaytime], colorSettings[3]);
    const value = createHtmlElement("dd", `${bm.yourServersPlaytime} hours`, currentClass ? [currentClass] : []);
    return [title, value];
}
function getBmRustHoursElements(bm, settings) {
    const title = createHtmlElement("dt", "Rust Hours:");

    let currentClass = getAscendingClassString(settings, [bm.combinedPlaytime], settings[3])
    const value = createHtmlElement("dd", `${bm.combinedPlaytime} hours`, currentClass ? [currentClass] : []);
    return [title, value];
}
function getAimTrainingElements(bm, settings) {
    const title = createHtmlElement("dt", "Aim Training:");

    let currentClass = getAscendingClassString(settings, [bm.aimTrainPlaytime], settings[3])
    const value = createHtmlElement("dd", `${bm.aimTrainPlaytime} hours`, currentClass ? [currentClass] : []);
    return [title, value];
}
function getKillCountElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Kills:");

    const killCount = bm.kills.length
    let killValueString = "" + killCount;

    let recentKillCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentKillCount = bm.kills.filter(kill => kill > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        killValueString += ` (${recentKillCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [killCount, recentKillCount], settings[3])
    const value = createHtmlElement("dd", killValueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getDeathElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "Deaths:");

    const deathCount = bm.deaths.length
    let deathValueString = "" + deathCount;
    let recentDeathCount = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        recentDeathCount = bm.deaths.filter(death => death > barrier).length;
        const timeString = getBmInfoTimeString(recent);
        deathValueString += ` (${recentDeathCount} in ${timeString})`;
    }
    let currentClass = getDescendingClassString(settings, [deathCount, recentDeathCount], settings[3])
    const value = createHtmlElement("dd", deathValueString, currentClass ? [currentClass] : []);
    return [title, value];
}
function getKdElements(bm, settings, recent) {
    const title = createHtmlElement("dt", "K/D:");

    const kd = bm.kills.length / Math.max(bm.deaths.length, 1);
    let kdValueString = kd.toFixed(2);

    let recentKd = -1;
    if (recent !== -1) {
        const barrier = Date.now() - recent;
        const recentKills = bm.kills.filter(kill => kill > barrier);
        const recentDeaths = bm.deaths.filter(death => death > barrier);
        const timeString = getBmInfoTimeString(recent);

        recentKd = recentKills.length / Math.max(recentDeaths.length, 1);
        kdValueString += ` (${recentKd.toFixed(2)} in ${timeString})`;
    }

    let currentClass = getDescendingClassString(settings, [kd, recentKd], settings[3])
    const value = createHtmlElement("dd", kdValueString, currentClass ? [currentClass] : []);
    return [title, value]
}

function getDescendingClassString(settings, values, invertColors = false) {
    const value = Math.max(...values);
    if (settings[0] !== -1 && value > settings[0]) return invertColors ? "bme-green-text" : "bme-red-text";
    if (settings[1] !== -1 && value > settings[1]) return "bme-yellow-text";
    if (settings[2] !== -1 && value > settings[2]) return invertColors ? "bme-red-text" : "bme-green-text";
    return "";
}
function getAscendingClassString(settings, values, invertColors = false) {
    const value = Math.max(...values);
    if (settings[0] !== -1 && value < settings[0]) return invertColors ? "bme-green-text" : "bme-red-text";
    if (settings[1] !== -1 && value < settings[1]) return "bme-yellow-text";
    if (settings[2] !== -1 && value < settings[2]) return invertColors ? "bme-red-text" : "bme-green-text";
    return "";
}

function createHtmlElement(node, innerText, classList = []) {
    const element = document.createElement(node);
    if (classList.length > 0) element.classList.add(...classList)
    element.innerHTML = innerText;
    return element;
}

function createSeparator() {
    const sep = document.createElement("div");
    sep.classList.add("bme-dl-separator");
    return sep;
}





const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
function getBmInfoTimeString(timestamp) {
    if (timestamp > (3 * ONE_DAY)) return `${Math.floor(timestamp / ONE_DAY)} days`;
    if (timestamp > ONE_HOUR) return `${Math.floor(timestamp / ONE_HOUR)} hours`;
    if (timestamp > ONE_MINUTE) return `${Math.floor(timestamp / ONE_MINUTE)} minutes`;
    if (timestamp > ONE_SECOND) return `${Math.floor(timestamp / ONE_SECOND)} seconds`
    return NaN;
}

function checkAltsWithProgress(type, bmId, BMToken, valueEl) {
    const requestId = Math.floor(Math.random() * 1000000);
    const fullType = `${type}_${requestId}`;

    valueEl.innerHTML = "";
    const track = document.createElement("div");
    track.classList.add("bme-progress-track");
    const bar = document.createElement("div");
    bar.classList.add("bme-progress-bar");
    track.appendChild(bar);
    const label = document.createElement("span");
    label.classList.add("bme-progress-label");
    label.innerText = "0 / ?";
    valueEl.append(track, label);

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            chrome.runtime.onMessage.removeListener(handler);
            reject(new Error("TIMEOUT"));
        }, 90000);

        function handler(response) {
            if (response?.type === `${fullType}_PROGRESS`) {
                bar.style.width = `${(response.current / response.total) * 100}%`;
                label.innerText = `${response.current} / ${response.total}`;
                if (response.rateLimitRemaining != null) {
                    document.dispatchEvent(new CustomEvent("bme:ratelimit", {
                        detail: { remaining: response.rateLimitRemaining, max: response.rateLimitMax ?? null }
                    }));
                }
                return;
            }
            if (response?.type === `${fullType}_RESOLVED`) {
                clearTimeout(timer);
                chrome.runtime.onMessage.removeListener(handler);
                if (response.rateLimitRemaining != null) {
                    document.dispatchEvent(new CustomEvent("bme:ratelimit", {
                        detail: { remaining: response.rateLimitRemaining, max: response.rateLimitMax ?? null }
                    }));
                }
                if (response.status === "ERROR") reject(new Error(response.message || "ERROR"));
                else resolve(response.value);
            }
        }

        chrome.runtime.onMessage.addListener(handler);
        chrome.runtime.sendMessage({ type: fullType, subject: bmId, apiKey: BMToken });
    });
}

function renderAltCheckResults(element, results) {
    if (!results || !Array.isArray(results)) {
        element.innerText = "Error";
        return;
    }
    if (results.length === 0) {
        element.innerText = "None";
        return;
    }
    element.innerHTML = "";
    element.appendChild(document.createTextNode(`${results.length}: `));
    results.forEach((player, i) => {
        if (i > 0) element.appendChild(document.createTextNode(", "));
        const link = document.createElement("a");
        link.href = `https://www.battlemetrics.com/rcon/players/${player.id}`;
        link.target = "_blank";
        link.innerText = player.name || player.id;
        element.appendChild(link);
    });
}