import { getElementWhenAppears, getIdentifierType, getTimeString } from "../../misc.js";
import { getProxyCheckIpInfo } from "../cache.js";

export async function showExtraDataOnIps(bmId, bmProfile, requestProxyCheck) {
    bmProfile = await bmProfile;


    let ips = bmProfile.included
        .filter(item => item.attributes.type === "ip")
        .map(item => {
            const conInfo = item.attributes?.metadata?.connectionInfo;
            const isVpn = conInfo ? conInfo.datacenter || conInfo.proxy || conInfo.tor : false;
            const isp = Boolean(conInfo?.isp) ? conInfo.isp : null;
            const asn = Boolean(conInfo?.asn) ? conInfo.asn : null;
            const lastSeen = item?.attributes?.lastSeen ? new Date(item.attributes.lastSeen).getTime() : 0;
            return {
                id: item.id ?? null,
                ip: item.attributes?.identifier ?? null,
                isp, asn, isVpn, lastSeen
            }
        });

    if (requestProxyCheck) {
        const proxyCheckData = await getProxyCheckIpInfo(ips);
        ips = ips.map(item => {
            const ip = item.ip;
            const proxyCheck = proxyCheckData.get(ip) || null;

            return { ...item, proxyCheck }
        })
    }


    const longestIp = Math.max(...ips.filter(ip => ip.ip).map(ip => ip.ip.length), 15);
    const longestIsp = Math.max(...ips.filter(ip => ip.isp).map(ip => ip.isp.length));
    const longestAsn = Math.max(...ips.filter(ip => ip.asn).map(ip => ip.asn.length));

    const identifierWrapper = (await getElementWhenAppears("css-11gv980", true));
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) console.error("BM-EXTRA: Failed to find identifier table.");


    for (const identifier of identifierTable) {
        const { type, id } = getIdentifierType(identifier);
        if (type !== "IP") continue;
        if (!id) continue;

        const ipObject = ips.find(ip => ip.id == id);
        if (!ipObject) continue;
        if (ipObject.isp === null) continue;

        const ipElement = identifier?.firstChild?.firstChild?.lastChild;
        const ipValue = `${ipElement.innerText}`.padEnd(longestIp);
        const ispValue = `${ipObject.isp}`.padEnd(longestIsp);
        const asnValue = `${ipObject.asn}`.padEnd(longestAsn);

        const conTypeValue = getConType(ipObject.proxyCheck)
        const conTypeString = conTypeValue && typeof (conTypeValue) === "object" ?
            `<span class="${conTypeValue.color}">${conTypeValue.value}</span>` :
            conTypeValue;

        const text = `${ipValue}  |  ISP: ${ispValue}  |  ${asnValue}${conTypeString ? `  |  ${conTypeString}` : ``}`;
        ipElement.innerHTML = text;

        const pcData = ipObject.proxyCheck;
        if (!pcData) continue;
        const pcDataElement = getPcDataElement(ipObject.proxyCheck);
        ipElement.classList.add("bme-pc-ip-main")
        ipElement.after(pcDataElement)

        ipElement.addEventListener("click", e => {
            const t = e.target;                
            if (pcDataElement.classList.contains("bme-pc-open"))
                return pcDataElement.classList.remove("bme-pc-open");

            pcDataElement.classList.add("bme-pc-open");
        })

    }
}

function getPcDataElement(pc) {
    const element = document.createElement("div");
    element.classList.add("bme-ip-nest")
    element.addEventListener("click", e => {
        if (e.target.classList.contains("bme-pc-open"))
            e.target.classList.remove("bme-pc-open");;
    })
    "compromised:"
    const table = document.createElement("div");
    table.classList.add("bme-pc-details-table")

    const firstRow = getPcInfoFirstRow(pc);
    const secondRow = getPcInfoSecondRow(pc);
    const thirdRow = getPcInfoThirdRow(pc);
    table.append(firstRow, secondRow, thirdRow);

    element.append(table)

    return element;
}
function getPcInfoFirstRow(pc) {
    const firstRow = document.createElement("div");
    firstRow.classList.add("bme-pc-details-row")
    firstRow.style.setProperty("--width", "20ch");

    const firstRowContent = [
        { label: "vpn:", value: trueOrFalse(pc.det.vpn, true, false) },
        { label: "proxy:", value: trueOrFalse(pc.det.proxy, true, false) },
        { label: "scraper:", value: trueOrFalse(pc.det.scraper, true, false) },
        { label: "tor:", value: trueOrFalse(pc.det.tor, true, false) },
        { label: "anonymous:", value: trueOrFalse(pc.det.anon, true, false) },
        { label: "compromised:", value: trueOrFalse(pc.det.compromised, true, false) },
    ]

    firstRowContent.forEach(item => {
        const element = document.createElement("div");
        element.classList.add("bme-pc-details-column")

        const label = document.createElement("span");
        label.style.setProperty("--width", "13ch")
        label.innerText = item.label;

        const value = document.createElement("span");
        value.style.setProperty("--width", "7ch")
        if (item.value.color) value.classList.add(item.value.color);
        value.innerText = item.value.value;
        element.append(label, value);

        firstRow.append(element);
    })

    return firstRow;
}
function getPcInfoSecondRow(pc) {
    const secondRow = document.createElement("div");
    secondRow.classList.add("bme-pc-details-row")
    secondRow.style.setProperty("--width", "35ch");
    const secondRowContent = [
        { label: "score:", value: getScore(pc.det.score) },
        { label: "risk:", value: getScore(pc.det.risk, true) },
        { label: "zone:", value: `${pc.loc.continent} | ${pc.loc.countryCode} | ${pc.loc.regionCode}` },
        { label: "county:", value: pc.loc.countryName },
        { label: "region:", value: pc.loc.regionName },
        { label: "city:", value: pc.loc.cityName },
    ]
    secondRowContent.forEach(item => {
        const element = document.createElement("div");
        element.classList.add("bme-pc-details-column")

        const label = document.createElement("span");
        label.style.setProperty("--width", "10ch")
        label.innerText = item.label;

        const value = document.createElement("span");
        value.style.setProperty("--width", "25ch")

        if (item.value && typeof (item.value) === "object") {
            if (item.value.color) value.classList.add(item.value.color);
            value.innerText = item.value.value;

        } else value.innerText = item.value;

        element.append(label, value);

        secondRow.append(element);
    })

    return secondRow;
}
function getPcInfoThirdRow(pc) {
    const thirdRow = document.createElement("div");
    thirdRow.classList.add("bme-pc-details-row")
    thirdRow.style.setProperty("--width", "55ch");
    const thirdRowContent = [
        { label: "ASN:", value: pc.net.asn },
        { label: "ISP:", value: pc.net.isp?.substring(0, 40) },
        { label: "Org:", value: pc.net.org?.substring(0, 40) },
        { label: "Host:", value: pc.net.host?.substring(0, 40) || "null" },
        { label: "Range:", value: pc.net.range },
        { label: "Type:", value: getConType(pc) },
    ]
    thirdRowContent.forEach(item => {
        const element = document.createElement("div");
        element.classList.add("bme-pc-details-column")

        const label = document.createElement("span");
        label.style.setProperty("--width", "10ch")
        label.innerText = item.label;

        const value = document.createElement("span");
        value.style.setProperty("--width", "45ch")

        if (typeof (item.value) === "object") {
            if (item.value.color) value.classList.add(item.value.color);
            value.innerText = item.value.value;

        } else value.innerText = item.value;

        element.append(label, value);

        thirdRow.append(element);
    })

    return thirdRow;
}

function trueOrFalse(value, redColor, greenColor) {
    const color = value === redColor ? "bme-red-text" : value === greenColor ? "bme-green-text" : null;
    return { value, color }
}
function getScore(value, reverse = false) {
    let color = null;
    if (reverse) color = value > 75 ? "red" : value > 25 ? "yellow" : value >= 0 ? "green" : null;
    else color = value > 75 ? "green" : value > 25 ? "yellow" : value >= 0 ? "red" : null;

    if (!color) return value
    return { value, color: `bme-${color}-text` };
}
function getConType(pc) {
    if (pc === null) return null;

    const type = pc?.net?.type;
    if (type === "Hosting" || type === "Wireless") return { value: type, color: "bme-red-text" }
    return type || "N/A";
}
export async function highlightVpnIdentifiers(bmId, vpnSettings) {
    const identifierWrapper = (await getElementWhenAppears("css-11gv980", true));
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) console.error("BM-EXTRA: Failed to find identifier table.");

    for (const identifier of identifierTable) {
        const { type, id } = getIdentifierType(identifier);
        if (type !== "IP") continue;
        if (!identifier.firstChild?.innerText?.includes("This IP appears to belong to")) continue;
        makeItVpn(identifier, vpnSettings);
    }
    if (vpnSettings.threshold > -1) checkConnections(identifierTable, vpnSettings);
}
async function checkConnections(identifierTable, vpnSettings) {
    for (let i = 0; i < 50; i++) { //Wait till shared identifiers load
        if (!document.body.contains(identifierTable[0])) return;
        if (identifierTable[0].parentNode.innerText.includes("Identifier shared with")) break;
        await new Promise(r => { setTimeout(r, 150 * (i / 10)) })
    }

    for (const identifier of identifierTable) {
        const { type, id } = getIdentifierType(identifier);
        if (type !== "IP") continue;
        if (identifier.classList.contains("bme-vpn-identifier")) continue;

        const sharedText = identifier?.firstChild?.lastChild?.innerText?.trim();
        if (!sharedText.includes("Identifier shared with")) continue;

        let connectionCount = sharedText === "Identifier shared with more than 250 players." ?
            250 : Number(sharedText.split("with ")[1].split(" player")[0]);

        if (connectionCount > vpnSettings.threshold) makeItVpn(identifier, vpnSettings);
    }

}
function makeItVpn(identifier, vpnSettings) {
    identifier.classList.add("bme-vpn-identifier");
    identifier.style.background = vpnSettings.background;
    identifier.style.opacity = vpnSettings.opacity;
    if (vpnSettings.label) {
        const nodes = identifier.firstChild.childNodes;
        nodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) node.remove(); });
    }
}

export async function displayAvatars(bmId, avatars, zoomable) {
    avatars = await avatars;

    const identifierWrapper = (await getElementWhenAppears("css-11gv980", true));
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) return console.error("BM-EXTRA: Failed to find identifierTable!");
    const nameElement = Array.from(identifierTable).find(item => item?.innerText?.trim() === "Name");
    if (!nameElement) return console.error("BM-EXTRA: Failed to locate nameElement!");

    if (avatars.length === 0) return;
    const avatarTitle = getAvatarTitle();
    nameElement.before(avatarTitle);

    avatars.forEach(avatar => {
        const avatarElement = getAvatarElement(avatar, zoomable);
        nameElement.before(avatarElement);
    })
}
function getAvatarTitle() {
    const element = document.createElement("tr");
    element.classList.add("css-147tpna");

    const inner = document.createElement("th")
    inner.colSpan = 3;
    inner.innerText = "Avatar";
    element.append(inner);

    return element;
}
function getAvatarElement(item, zoomable) {
    const tr = document.createElement("tr");
    const lastSeen = item.lastSeen * 1000;
    const iso = new Date(lastSeen).toISOString();

    //Heavily modified Standard BattleMetrics Identifier
    tr.innerHTML = `
        <td data-title="Identifier">
            <div title="${item.avatar}" class="css-8uhtka bme-avatar-container ${zoomable ? "bme-zoomable-avatar" : ""}">
                <div class="bme-avatar-placeholder">
                    <div>
                        <img src="https://avatars.fastly.steamstatic.com/${item.avatar}_full.jpg" class="bme-avatar-identifier">
                    </div>
                </div>
                <span class="css-q39y9k" title="${item.avatar}">${item.avatar}${item.avatarHits !== "N/A" ? ` | Seen on ${item.avatarHits < 101 ? item.avatarHits : "100+"} players` : ""}</span>
            </div>
        </td>
        <td data-title="Type">
            <div class="css-18s4qom">Avatar</div>
        </td>
        <td data-title="Last Seen">
            <time>${`${iso.substring(8, 10)}/${iso.substring(5, 7)}/${iso.substring(0, 4)}`}</time><br />
            <time class="css-18s4qom">${iso.substring(12, 17)}</time>
            <time class="css-18s4qom">${getTimeString(lastSeen)} ago</time>
        </td>
    `;

    return tr;
}
