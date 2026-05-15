import { removeSidebars } from "../misc.js";
import { cache, setupCacheFor } from "../page/cache/cache.js";
import { checkAndSetupSettingsIfMissing } from "../settings.js";
import { insertBanPresets, insertFriendComparator, insertFriendsSidebarElement, insertHistoricFriendsSidebarElement, insertPublicBansSidebarElement, insertSidebars, insertTeaminfoSidebarElement } from "../sidebar.js";
import { checkForUpdates, convertTimestampsToDay, displayAvatar, displaySettingsButton, redactIdentifiers, selectLastServer, swapBattleEyeGuid } from "./display.js";
import { addSharedIpNameCheck, displayAvatars, highlightVpnIdentifiers, showExtraDataOnIps } from "./identifier/identifier.js";
import { advancedBans, closeAdminLog, displayAlertLink, displayInfoPanel, displayServerActivity, hideIpOnProfile, limitItem, removeSteamInformation, setupRateLimitBadge } from "./overview/overview.js";

let settingsChecked = false;
export function router(url) {
    if (!settingsChecked) {
        checkAndSetupSettingsIfMissing();

        const privacySettings = JSON.parse(localStorage.getItem("BME_KEYBINDS_SETTINGS"));
        detectHotkey(privacySettings);

        settingsChecked = true;
    }

    const path = url.pathname.split("/").filter(Boolean);
    //rcon/players...
    if (path[0] === "rcon" && path[1] === "players" && path.length > 2) {
        const bmId = path[2];
        if (isNaN(Number(bmId))) return;

        setupCacheFor(bmId, "RCON_PROFILE");
        const overviewSettings = JSON.parse(localStorage.getItem("BME_OVERVIEW_SETTINGS"));
        if (overviewSettings?.showRateLimit) setupRateLimitBadge();

        if (path[3] === undefined) return onOverviewPage(bmId);
        if (path[3] === "identifiers") return onIdentifierPage(bmId);
    }

    //rcon/bans/add...
    if (path[0] === "rcon" && path[1] === "bans" && path[2] === "add") {
        const bmId = url.searchParams.get("player");
        if (!bmId || isNaN(Number(bmId))) return;

        setupCacheFor(bmId, "BAN_PAGE");

        return onAddBanPage(bmId);
    }

    //Remove sidebar in any other case
    removeSidebars();
}
async function onOverviewPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_OVERVIEW_SETTINGS"))

    const playerCache = cache[bmId];

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    sidebar(bmId, playerCache, sidebarSettings)

    displaySettingsButton();
    if (settings.checkForUpdates) checkForUpdates();
    if (settings.showAlert) displayAlertLink(bmId);
    if (settings.showServer) displayServerActivity(bmId, playerCache.bmProfile);
    if (settings.showInfoPanel) displayInfoPanel(bmId, playerCache.bmProfile, playerCache.steamData, playerCache.bmActivity);
    if (settings.showAvatar) displayAvatar(bmId, playerCache.bmProfile, playerCache.steamData);
    if (settings.removeSteamInfo) removeSteamInformation(bmId);
    if (settings.advancedBans) advancedBans(bmId, playerCache.bmBanData);
    if (settings.closeAdminLog) closeAdminLog(bmId);
    if (settings.swapBattleEyeGuid) swapBattleEyeGuid(bmId, playerCache.bmProfile);
    if (settings.maxNames > 0) limitItem(bmId, settings.maxNames, "Name");
    if (settings.maxIps > 0) limitItem(bmId, settings.maxIps, "IP");
    if (settings.hideIp) hideIpOnProfile(bmId);
}
async function onIdentifierPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_IDENTIFIER_SETTINGS"))

    const playerCache = cache[bmId];

    const sidebarSettings = JSON.parse(localStorage.getItem("BME_SIDEBAR_SETTINGS"));
    sidebar(bmId, playerCache, sidebarSettings)

    if (settings.showAvatar) displayAvatar(bmId, playerCache.bmProfile, playerCache.steamData);
    if (settings.showIspAndAsnData) showExtraDataOnIps(bmId, playerCache.bmProfile, settings.requestProxyCheck)
    if (settings.highlightVpn) highlightVpnIdentifiers(bmId, { label: settings.removeVpnLabel, threshold: settings.vpnAbove, background: settings.vpnBgColor, opacity: settings.vpnOpacity })
    if (settings.displayAvatars) displayAvatars(bmId, playerCache.identifiers.avatars, settings.zoomableAvatars)
    if (settings.swapBattleEyeGuid) swapBattleEyeGuid(bmId, playerCache.bmProfile);
    if (settings.checkSimilarNames) addSharedIpNameCheck(bmId, playerCache.bmProfile);
}
async function onAddBanPage(bmId) {
    const settings = JSON.parse(localStorage.getItem("BME_BAN_PAGE_SETTINGS"))

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

let currentHotkeyTimeout = null;
let currentSequence = "";
function detectHotkey(settings) {
    const binds = [];
    for (const key in settings) {
        if (!settings[key].enabled) return;

        binds.push({ type: key, hotkey: settings[key].hotkey });
    }

    if (binds.length === 0) return; //No keybinds active

    document.addEventListener("keydown", e => {
        if (e.repeat) return;
        if (!e.key) return;

        const key = e.key === "+" ? "plus" : e.key.toLowerCase();
        if (!currentSequence) currentSequence = key;
        else currentSequence += `+${key}`;

        if (currentHotkeyTimeout) clearTimeout(currentHotkeyTimeout);

        currentHotkeyTimeout = setTimeout(() => {
            currentSequence = "";
        }, 350);

        for (const bind of binds) {
            if (bind.hotkey !== currentSequence) continue;

            keyBindActivated(bind.type, settings[bind.type]);
        }
    })
}

function keyBindActivated(type, settings) {
    if (type === "privacy") redactIdentifiers(settings.redactSteamId, settings.redactIps, settings.redactTime);
    if (type === "showDays") convertTimestampsToDay(settings.duration)
}