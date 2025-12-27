import { checkIfAlright, getElementWhenAppears, getLastServer, getStreamerModeName, getSteamIdObject, setNativeValue } from "../misc.js";
import { displaySettings } from "../settings.js";

export async function displaySettingsButton(bmId) {
    const rconElement = await getElementWhenAppears("RCONPlayerPage");

    const title = rconElement?.firstChild;
    if (!title) return console.error("BM-EXTRA: Failed to locate title.")
    title.classList.add("bme-flex");

    const button = document.createElement("img");
    button.id = "bme-settings-button"
    button.src = chrome.runtime.getURL('assets/img/settings.png');

    button.addEventListener("click", displaySettings)

    const testElement = document.getElementById("bme-settings-button");
    if (!testElement) title.appendChild(button);
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
    if (location.href.split("/").length === 6)
        await getElementWhenAppears("RCONPlayerPage");

    const title = mainElement?.firstChild?.firstChild;
    if (!title) return;

    const avatarElement = document.createElement("img");
    avatarElement.src = avatarUrl;
    avatarElement.id = "bme-avatar";

    if (checkIfAlright(bmId, "bme-avatar")) return;

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
    
    const target = String(lastServer.id);
    setNativeValue(servers, target, true);
}