const _getElement = {};
export function getElementWhenAppears(identifier, isClass) {
    identifier = isClass ? `.${identifier}` : `#${identifier}`;
    if (!_getElement[identifier] || Date.now() > (_getElement[identifier].timestamp + 50)) {
        _getElement[identifier] = {
            timestamp: Date.now(),
            element: findElementWhenAppears(identifier)
        }
    }

    return _getElement[identifier].element;
}
async function findElementWhenAppears(selector) {
    let element = document.querySelector(selector);
    let count = 0;

    while (!element) {
        if (count > 50) break;
        await new Promise(r => setTimeout(r, 25 + (count * 5)));

        element = document.querySelector(selector);
        count++;
    }
    if (!element) return null;
    return element;
}

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 12 * ONE_MONTH;
export function getTimeString(timestamp, left = false) {
    let since = null;

    if (left) {
        since = timestamp;
    } else {
        const now = Date.now();
        since = now - timestamp;
    }

    if (since > ONE_YEAR) return `${(since / ONE_YEAR).toFixed(1)} years`;
    if (since > ONE_MONTH) return `${(since / ONE_MONTH).toFixed(1)} months`;
    if (since > ONE_DAY) return `${Math.floor(since / ONE_DAY)} days`;
    if (since > ONE_HOUR) return `${Math.floor(since / ONE_HOUR)} hours`;
    if (since > ONE_MINUTE) return `${Math.floor(since / ONE_MINUTE)} minutes`;
    if (since > ONE_SECOND) return `${Math.floor(since / ONE_SECOND)} seconds`
    return "NaN";
}
export function getBmInfoTimeString(timestamp) {
    if (timestamp > (3 * ONE_DAY)) return `${Math.floor(timestamp / ONE_DAY)} days`;
    if (timestamp > ONE_HOUR) return `${Math.floor(timestamp / ONE_HOUR)} hours`;
    if (timestamp > ONE_MINUTE) return `${Math.floor(timestamp / ONE_MINUTE)} minutes`;
    if (timestamp > ONE_SECOND) return `${Math.floor(timestamp / ONE_SECOND)} seconds`
    return "NaN";
}

export async function getSteamFriendlistFromSteam(steamId) {
    try {
        const STEAM_API_KEY = localStorage.getItem("BME_STEAM_API_KEY");
        if (!STEAM_API_KEY) return "NO_API_KEY";

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== "BME_STEAM_FRIENDLIST_RESOLVED") return;
            if (response.status === "ERROR") throw new Error(`Failed to request steam friends: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: "BME_STEAM_FRIENDLIST", subject: steamId, apiKey: STEAM_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 10); })
        return value;
    } catch (error) {
        console.error(error);
        return "ERROR";
    }
}
export async function getSteamFriendlistFromRustApi(steamId) {
    try {
        const RUST_API_KEY = localStorage.getItem("BME_RUST_API_KEY");
        if (!RUST_API_KEY) return "NO_API_KEY";
        if (RUST_API_KEY[54] !== "1") return "MISSING_PERMISSION"

        let value = null;
        chrome.runtime.onMessage.addListener(function (response) {
            if (response.type !== "BME_RUST_API_FRIENDLIST_RESOLVED") return;
            if (response.status === "ERROR") throw new Error(`Failed to request rust api friends: \n  ${response.message}`);

            value = response.value;
        })

        chrome.runtime.sendMessage({ type: "BME_RUST_API_FRIENDLIST", subject: steamId, apiKey: RUST_API_KEY });
        while (!value) await new Promise(r => { setTimeout(r, 10); })
        return value;
    } catch (error) {
        console.error(error);
        return "ERROR";
    }
}
export function getStreamerModeName(steamId) {
    const names = JSON.parse(localStorage.getItem("BME_SM_NAMES"))?.names;
    if (!names) return null;

    let v = BigInt(steamId) % 2147483647n;
    v = v % BigInt(names.length);

    return names[Number(v)];
}
export function checkIfAlright(bmId, elementId, pageId) {
    const urlId = location.href.split("/")[5];
    if (urlId !== bmId) return true; //Page changed
    if (elementId) {
        const elementCheck = document.getElementById(elementId);
        if (elementCheck) return true; //Already exist
    }
    if (pageId === "overview") {
        if (!window.location.href.includes("/players/")) return true;
        if (window.location.href.split("/").length !== 6) return true;
    }

    return false; //Good to go!
}

export async function getLastServer(bmProfile, onlyMyServer) {
    const myServers = await getMyServers(true);
    if (!myServers) return null;

    let servers = bmProfile.included
        .filter(item => item.type === "server")
        .map(server => {
            return {
                name: server.attributes?.name,
                id: server.id,
                orgId: server?.relationships?.organization?.data?.id,
                lastPlayed: new Date(server.meta.lastSeen).getTime(),
                online: server.meta.online,
            }
        })
        .sort((a, b) => b.lastPlayed - a.lastPlayed);


    if (onlyMyServer) {
        servers = servers.filter(item => myServers.includes(item.id));
        const lastServer = servers[0];
        if (!lastServer) return null;
        return lastServer;
    }

    const lastServer = servers[0];
    if (!lastServer) return null;
    return lastServer
}
export async function getMyServers(onlyIds) {
    const externalAuthToken = localStorage.getItem("BME_BATTLEMETRICS_API_KEY");
    const internalAuthToken = !externalAuthToken ? getAuthToken() : null;
    const token = externalAuthToken ? externalAuthToken : internalAuthToken;

    let myServers = JSON.parse(localStorage.getItem("BME_MY_SERVER_CACHE"));
    if (myServers && myServers.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        if (onlyIds) return myServers.servers.map(server => server.id);
        else return myServers.servers;
    }

    const resp = await fetch(`https://api.battlemetrics.com/servers?version=^0.1.0&filter[rcon]=true&page[size]=100&access_token=${token}`)
    if (resp?.status !== 200) {
        console.error(`Failed to request your servers | Status: ${resp?.status}`);
        return null;
    }

    const data = await resp.json();
    myServers = {
        timestamp: Date.now(),
        servers: data.data.map(server => {
            return {
                id: server.id,
                name: server?.attributes?.name,
                orgId: server?.relationships?.organization?.data?.id
            }
        })
    }

    localStorage.setItem("BME_MY_SERVER_CACHE", JSON.stringify(myServers))
    if (onlyIds) return myServers.servers.map(server => server.id);
    else return myServers.servers;
}
export function getAuthToken() {
    const authElement = document.getElementById("oauthToken");
    if (!authElement) {
        console.error("BM-EXTRA: Auth element wasn't found.")
        return null;
    }
    const authToken = authElement.innerText;
    if (!authToken) {
        console.error("BM-EXTRA: Auth Token is missing.")
        return null;
    }

    return authToken;
}

export function setNativeValue(select, value, highlight) {
    const originalValue = select.value;

    select.value = value;
    if (select.value !== value) {
        select.value = originalValue;
        if (highlight) highlightElement(select, "red");
        return;
    }
    if (highlight) highlightElement(select, "green");

    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
}
function highlightElement(element, color) {
    element.classList.add(`bme-${color}-change`);
    setTimeout(() => { element.classList.remove(`bme-${color}-change`); }, 400);
}