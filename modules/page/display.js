import { getElementWhenAppears, getIdentifierType, getLastServer, getSteamIdObject, getStreamerModeName, getTimeSpan, setNativeValue, shouldAbort } from "../misc.js";
import { displaySettings } from "../settings.js";

export async function displaySettingsButton(bmId) {
    const rconElement = await getElementWhenAppears("RCONPlayerPage");

    const li = document.createElement("li");
    li.id = "bme-settings-button";

    const a = document.createElement("a");
    a.href = "";
    a.className = "blue-button";
    a.textContent = "BM Extra";
    a.addEventListener("click", (e) => { e.preventDefault(); displaySettings(); });

    li.appendChild(a);

    const testElement = document.getElementById("bme-settings-button");
    if (!testElement) rconElement.before(li);
}

let _updateChecked = false;
export async function checkForUpdates() {
    if (_updateChecked) return;
    _updateChecked = true;

    try {
        const resp = await fetch("https://api.github.com/repos/panadodev/bm-extra/releases/latest");
        if (!resp.ok) return;
        const data = await resp.json();
        const latestVersion = data.tag_name?.replace(/^v/, "");
        if (!latestVersion) return;

        const currentVersion = chrome.runtime.getManifest().version;
        console.log(`BM-EXTRA: current version: ${currentVersion} | latest release: ${latestVersion}`);
        const toNum = v => v.split(".").reduce((acc, n, i) => acc + Number(n) * Math.pow(1000, 2 - i), 0);
        if (toNum(latestVersion) <= toNum(currentVersion)) return;

        const settingsBtn = await getElementWhenAppears("bme-settings-button");
        if (!settingsBtn) return;

        const badge = document.createElement("a");
        badge.id = "bme-update-badge";
        badge.href = "https://github.com/panadodev/bm-extra/releases/latest";
        badge.target = "_blank";
        badge.className = "green-button";
        badge.textContent = "Update available";
        badge.title = `New version: ${latestVersion} (current: ${currentVersion})`;

        settingsBtn.appendChild(badge);
    } catch (error) {
        console.error(`BM-EXTRA: ${error}`);
    }
}

export async function displayAvatar(bmId, bmProfile, bmSteamData) {
    bmProfile = await bmProfile;

    let avatarUrl = "";

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const profile = steamIdObject?.attributes?.metadata?.profile;
    if (profile) avatarUrl = profile.avatarmedium;

    if (!avatarUrl) {
        bmSteamData = await bmSteamData;
        const avatar = bmSteamData?.attributes?.avatar;
        if (!avatar) return;
        // avatarUrl = `https://avatars.fastly.steamstatic.com/${avatar}`.replace(".jpg", "_medium.jpg");
        return; // Disabled steamstatic.com usage
    }
    if (!avatarUrl) return;

    const mainElement = await getElementWhenAppears("main", true);

    //if overview page, wait till RCON element appears, last stage of page load
    if (location.href.split("/").length === 6) await getElementWhenAppears("RCONPlayerPage");

    const title = mainElement?.querySelector("div")?.firstChild;

    if (!title) return;

    const avatarElement = document.createElement("img");
    avatarElement.src = avatarUrl;
    avatarElement.id = "bme-avatar";

    if (shouldAbort(bmId, "bme-avatar")) return;
    title.insertAdjacentElement("afterbegin", avatarElement)
}

export async function swapBattleEyeGuid(bmId, bmProfile) {
    bmProfile = await bmProfile;

    const steamIdObject = getSteamIdObject(bmProfile.included);
    const steamId = steamIdObject?.attributes?.identifier;
    if (!steamId) return console.error("BM-EXTRA: Steam ID is missing")

    const smName = getStreamerModeName(steamId);
    if (!smName) return console.error("BM-EXTRA: Failed to get Streamer Mode name")

    const identifierWrapper = (await getElementWhenAppears("css-11gv980", true));
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) return console.error("BM-EXTRA: identifierTable is missing!")

    for (const identifier of identifierTable) {
        if (!identifier.innerText.includes("BattlEye GUID")) continue;

        const type = identifier.children[1];
        type.firstChild.innerText = "SM Name";
        type.lastChild.remove(); //Remove org lister
        type.lastChild.remove(); //Remove session button
        type.lastChild.remove(); //Remove copy button
        type.lastChild.remove(); //Remove empty p tag

        identifier.title = smName;
        identifier.children[0].firstChild.title = smName;
        const smNameElement = identifier.children[0]?.firstChild?.firstChild;
        smNameElement.innerText = smName;
        smNameElement.title = smName

        return;
    }
}

export async function selectLastServer(bmId, bmProfile) {
    bmProfile = await bmProfile;

    const lastServer = await getLastServer(bmProfile, true);
    const form = await getElementWhenAppears("ban-form", true)
    const formHeader = Array.from(form.children[0].children);

    let servers = null;
    for (const element of formHeader) {
        if (element.children.length !== 1) continue;
        const child = element.children[0];
        if (!child || child.nodeName !== "SELECT") continue;

        servers = child;
        break;
    }
    if (!servers) return console.error("BM-EXTRA: Failed to find servers!");

    const target = String(lastServer?.id);
    setNativeValue(servers, target, true);
}

let currentRedactedElements = [] //key, originalValue
let showIdentifiersTimeout = null;
export async function redactIdentifiers(redactSteamId, redactIps, redactTime) {
    const tables = Array.from(document.getElementsByClassName("css-11gv980"));
    tables.forEach(table => redactIdentifierTable(table, redactSteamId, redactIps));

    if (showIdentifiersTimeout) clearTimeout(showIdentifiersTimeout);
    showIdentifiersTimeout = setTimeout(() => {
        revertItems(currentRedactedElements, true);
        currentRedactedElements = [];
    }, redactTime);
}
function redactIdentifierTable(table, redactSteamId, redactIps) {
    const identifiers = Array.from(table?.lastChild?.children || []);
    for (const identifier of identifiers) {
        const identifierDetails = getIdentifierType(identifier);
        const type = identifierDetails?.type;
        if (type === null) continue;

        const span = identifier?.firstChild?.firstChild?.querySelector("span");
        if (!span) continue;

        if (type === "IP" && redactIps) {
            redactIdentifier(identifier, span, type);

            const range = identifier.querySelector(".bme-ip-range");
            if (range) redactIdentifier(identifier, range, "Range");

            const host = identifier.querySelector(".bme-ip-host");
            if (host) redactIdentifier(identifier, host, "Host");
            continue; //Check next
        }

        if ((type === "Steam ID" || type === "BattlEye GUID") && redactSteamId) {
            redactIdentifier(identifier, span, type);
            continue; //Check next
        }
    }
}
function redactIdentifier(identifier, span, type) {
    const spanValue = span.title;
    const originalValue = span.innerHTML;

    span.innerHTML = span.innerHTML.replaceAll(spanValue, "REDACTED");

    //Store it for later if it changed
    if (span.innerHTML === originalValue) return
    currentRedactedElements.push({ element: span, originalValue })

    if (type !== "IP") return;
    const button = identifier.querySelector(".bme-button");
    if (button) button.classList.add("bme-button-redacted")
}

let currentShowDaysElements = []; //key, originalValue
let showDaysTimeout = null;
export function convertTimestampsToDay(duration) {
    const spans = Array.from(document.querySelectorAll(".bme-time"));
    for (const span of spans) {
        const originalValue = span.textContent;

        const timestamp = span.dataset.raw;
        const isDuration = span.dataset.duration == "true" ? true : false

        const newSpan = new DOMParser().parseFromString(getTimeSpan(timestamp, isDuration, true), "text/html").body.firstElementChild;
        const newText = newSpan.textContent;

        if (newText === originalValue) continue; //No need to change

        currentShowDaysElements.push({ key: span, originalValue })
        span.textContent = newText;
    }

    if (showDaysTimeout) clearTimeout(showDaysTimeout);
    showDaysTimeout = setTimeout(() => {
        revertItems(currentShowDaysElements);
        currentShowDaysElements = [];
    }, duration);
}

function revertItems(arr, buttons) {
    for (const item of arr) item.key.textContent = item.originalValue;

    if (buttons) {
        const buttons = Array.from(document.querySelectorAll(".bme-button-redacted"));
        for (const button of buttons) button.classList.remove("bme-button-redacted")
    }
}