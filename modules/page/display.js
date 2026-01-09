import { shouldAbort, getElementWhenAppears, getLastServer, getStreamerModeName, getSteamIdObject, setNativeValue, getIdentifierType } from "../misc.js";
import { displaySettings } from "../settings.js";

export async function displaySettingsButton(bmId) {
    const rconElement = await getElementWhenAppears("RCONPlayerPage");

    const button = document.createElement("img");
    button.id = "bme-settings-button"
    button.src = chrome.runtime.getURL('assets/img/settings.png');

    button.addEventListener("click", displaySettings)

    const testElement = document.getElementById("bme-settings-button");
    if (!testElement) rconElement.before(button);
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
        avatarUrl = `https://avatars.fastly.steamstatic.com/${avatar}`.replace(".jpg", "_medium.jpg");
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

let currentRedactedElements = [] //key, originalText
let showIdentifiersTimeout = null;
export async function redactIdentifiers(redactSteamId, redactIps, redactTime) {
    const tables = Array.from(document.getElementsByClassName("css-11gv980"));
    tables.forEach(table => redactIdentifierTable(table, redactSteamId, redactIps));
    
    if (showIdentifiersTimeout) clearTimeout(showIdentifiersTimeout);
    showIdentifiersTimeout = setTimeout(() => {
        showIdentifiers();
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
function showIdentifiers() {
    for (const item of currentRedactedElements) item.element.innerHTML = item.originalValue;
    currentRedactedElements = [];

    const buttons = Array.from(document.querySelectorAll(".bme-button-redacted"));
    for (const button of buttons) button.classList.remove("bme-button-redacted")
}