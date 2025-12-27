import { setupCacheFor, cache } from "./cache.js";
import { checkAndSetupSettingsIfMissing } from "../settings.js";
import { advancedBans, closeAdminLog, displayInfoPanel, displayServerActivity, limitItem, removeSteamInformation, displayAlertLink } from "./overview/overview.js";
import { highlightVpnIdentifiers, showExtraDataOnIps, displayAvatars } from "./identifier/identifier.js";
import { displayAvatar, displaySettingsButton, selectLastServer, swapBattleEyeGuid } from "./display.js";
import { insertBanPresets, insertFriendComparator, insertFriendsSidebarElement, insertHistoricFriendsSidebarElement, insertPublicBansSidebarElement, insertSidebars, insertTeaminfoSidebarElement } from "../sidebar.js";

let settingsChecked = false;
export function router(url) {
    if (!settingsChecked) {
        checkAndSetupSettingsIfMissing();
        settingsChecked = true;
    }
    
    url = url.split(".com/")[1]
    const path = url.split("/")

    //rcon/players...
    if (path[0] === "rcon" && path[1] === "players" && path.length > 2) {
        const bmId = path[2];
        if (isNaN(Number(bmId))) return;

        setupCacheFor(bmId, "RCON_PROFILE");

        if (path[3] === undefined) return onOverviewPage(bmId);
        if (path[3] === "identifiers") return onIdentifierPage(bmId);
    }
    
    //rcon/bans/add...
    if (path[1] === "bans" && path[2]?.startsWith("add?player=")) {
        const bmId = path[2].split("=")[1];
        if (isNaN(Number(bmId))) return;
     
        setupCacheFor(bmId, "BAN_PAGE");

        return onAddBanPage(bmId);
    }

    //Remove sidebar in any other case
    const elementsToRemove = document.querySelectorAll(".bme-sidebar");
    elementsToRemove.forEach(item => item.remove())
}
async function onOverviewPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_OVERVIEW_SETTINGS"))
    if (!settings) return console.error(`BM-EXTRA: Main settings are missing!`);

    const playerCache = cache[bmId];

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)
    sidebar(bmId, playerCache, sidebarSettings)

    displaySettingsButton();
    if (settings.showAlert) displayAlertLink(bmId);
    if (settings.showServer) displayServerActivity(bmId, playerCache.bmProfile);
    if (settings.showInfoPanel) displayInfoPanel(bmId, playerCache.bmProfile, playerCache.steamData, playerCache.bmActivity, playerCache.rustPremium);
    if (settings.showAvatar) displayAvatar(bmId, playerCache.bmProfile, playerCache.steamData);
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.advancedBans) advancedBans(bmId, playerCache.bmBanData);
    if (settings.closeAdminLog) closeAdminLog(bmId);
    if (settings.swapBattleEyeGuid) swapBattleEyeGuid(bmId, playerCache.bmProfile);
    if (settings.maxNames > 0) limitItem(bmId, settings.maxNames, "Name");
    if (settings.maxIps > 0) limitItem(bmId, settings.maxNames, "IP");
}
async function onIdentifierPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_IDENTIFIER_SETTINGS"))
    if (!settings) return console.error(`BM-EXTRA: Main settings are missing!`);

    const playerCache = cache[bmId];

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    if (!sidebarSettings) return console.error(`BME-EXTRA: Sidebar settings are missing!`)
    sidebar(bmId, playerCache, sidebarSettings)

    if (settings.showAvatar) displayAvatar(bmId, playerCache.bmProfile, playerCache.steamData);
    if (settings.showIspAndAsnData) showExtraDataOnIps(bmId, playerCache.bmProfile, settings.requestProxyCheck)
    if (settings.highlightVpn) highlightVpnIdentifiers(bmId, { label: settings.removeVpnLabel, threshold: settings.vpnAbove, background: settings.vpnBgColor, opacity: settings.vpnOpacity })
    if (settings.displayAvatars) displayAvatars(bmId, playerCache.identifiers.avatars, settings.zoomableAvatars)

    swapBattleEyeGuid(bmId, playerCache.bmProfile);
}
async function onAddBanPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_BAN_PAGE_SETTINGS"))
    if (!settings) return console.error(`BM-EXTRA: Main settings are missing!`);

    const playerCache = cache[bmId];
    
    sidebar(bmId, playerCache, settings);

    if (settings.selectLastServer) selectLastServer(bmId, playerCache.bmProfile);
}
async function sidebar(bmId, playerCache, settings) {
    await insertSidebars();
    if (settings.friendComparator?.enabled) insertFriendComparator();
    if (settings.friends?.enabled) insertFriendsSidebarElement(playerCache.steamFriends, cache.connectedPlayersData, cache.connectedPlayersBanData, playerCache.serverPop, settings);
    if (settings.historicFriends?.enabled) insertHistoricFriendsSidebarElement(playerCache.historicFriends, playerCache.steamFriends, cache.connectedPlayersData, cache.connectedPlayersBanData, playerCache.serverPop, settings);
    if (settings.currentTeam?.enabled) insertTeaminfoSidebarElement(playerCache.team, cache.connectedPlayersData, cache.connectedPlayersBanData, settings);
    if (settings.publicBans?.enabled) insertPublicBansSidebarElement(playerCache.publicBans);

    if (settings.presets?.enabled) insertBanPresets(settings, playerCache.bmProfile);
}