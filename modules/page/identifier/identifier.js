import { getAuthToken, getElementWhenAppears, getIdentifierType, getTimeSpan } from "../../misc.js";
import { getProxyCheckIpInfo } from "../cache/cache.js";

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

    const padEndValues = {};
    padEndValues.identifier = Math.max(...ips.map(ip => ip?.ip?.length || 0), 15);
    padEndValues.isp = Math.max(...ips.map(ip => ip?.isp?.length || ip?.proxyCheck?.net?.isp?.length || 0), 3);
    padEndValues.asn = Math.max(...ips.map(ip => ip?.asn?.length || ip?.proxyCheck?.net?.asn?.length || 0), 3);

    const identifierWrapper = await getElementWhenAppears("css-11gv980", true);
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) console.error("BM-EXTRA: Failed to find identifier table.");

    for (const identifier of identifierTable) {
        const { type, id } = getIdentifierType(identifier);
        if (type !== "IP" || !id) continue;

        const ipObject = ips.find(ip => ip.id == id);
        if (!ipObject) continue;

        convertIdentifier(identifier, ipObject, padEndValues, requestProxyCheck)
    }
}
function convertIdentifier(identifier, ipObject, padEndValues, requestProxyCheck) {
    const ipElement = identifier?.firstChild?.firstChild?.querySelector("span");

    const ipAddress = ipElement?.innerText?.split(" | ")[0].trim();
    const ipValue = `${ipAddress}`.padEnd(padEndValues.identifier);
    const ispValue = `${ipObject.isp || ipObject.proxyCheck?.net?.isp || "N/A"}`.padEnd(padEndValues.isp);
    const asnValue = `${ipObject.asn || ipObject.proxyCheck?.net?.asn || "N/A"}`.padEnd(padEndValues.asn);

    const conTypeValue = getConType(ipObject.proxyCheck);

    const text = `${ipValue}  |  ISP: ${ispValue}  |  ${asnValue}`;
    ipElement.textContent = text;

    if (requestProxyCheck) {
        if (conTypeValue && typeof conTypeValue === "object") {
            const conSpan = document.createElement("span");
            conSpan.classList.add(conTypeValue.color);
            conSpan.textContent = conTypeValue.value;
            ipElement.append("  |  ", conSpan);
        } else if (conTypeValue) {
            ipElement.append(`  |  ${conTypeValue}`);
        } else {
            const pcButton = getPcButton(identifier, ipObject, padEndValues, requestProxyCheck);
            ipElement.after(pcButton);
        }
    }

    if (!ipObject.proxyCheck) return;
    const pcDataElement = getPcDataElement(ipObject.proxyCheck);
    ipElement.classList.add("bme-pc-ip-main")
    ipElement.after(pcDataElement)

    ipElement.addEventListener("click", e => {
        if (pcDataElement.classList.contains("bme-pc-open"))
            return pcDataElement.classList.remove("bme-pc-open");

        pcDataElement.classList.add("bme-pc-open");
    })
}
function getPcButton(identifier, ipObject, padEndValues, requestProxyCheck) {
    const button = document.createElement("button");
    button.classList.add("bme-button")
    button.innerText = "CHECK";

    button.addEventListener("click", async (e) => {
        if (e.target.classList.contains("bme-button-disabled")) return;
        if (e.target.classList.contains("bme-button-redacted")) return;
        if (e.target.classList.contains("bme-pressed")) return;
        e.target.classList.add("bme-pressed")

        const ipMap = await getProxyCheckIpInfo([ipObject], false);
        ipObject.proxyCheck = ipMap.get(ipObject.ip) || null;
        convertIdentifier(identifier, ipObject, padEndValues, requestProxyCheck)
        e.target.remove();
    })

    return button;
}
function getPcDataElement(pc) {
    const element = document.createElement("div");
    element.classList.add("bme-ip-nest")

    const table = document.createElement("div");
    table.classList.add("bme-pc-details-table")

    const firstSectionContent = [
        { maxWidth: "20ch", labelWidth: "13ch", valueWidth: "7ch" },
        { label: "vpn:", ...trueOrFalse(pc.det.vpn, true, false) },
        { label: "proxy:", ...trueOrFalse(pc.det.proxy, true, false) },
        { label: "scraper:", ...trueOrFalse(pc.det.scraper, true, false) },
        { label: "tor:", ...trueOrFalse(pc.det.tor, true, false) },
        { label: "anonymous:", ...trueOrFalse(pc.det.anon, true, false) },
        { label: "compromised:", ...trueOrFalse(pc.det.compromised, true, false) },
    ]
    const secondSectionContent = [
        { maxWidth: "35ch", labelWidth: "10ch", valueWidth: "25ch" },
        { label: "score:", ...getScore(pc.det.score) },
        { label: "risk:", ...getScore(pc.det.risk, true) },
        { label: "zone:", value: `${pc.loc.continent} | ${pc.loc.countryCode} | ${pc.loc.regionCode}` },
        { label: "county:", value: pc.loc.countryName },
        { label: "region:", value: pc.loc.regionName },
        { label: "city:", value: pc.loc.cityName },
    ]

    const host = pc.net.host?.substring(0, 40) || null;    
    const thirdSectionContent = [
        { maxWidth: "55ch", labelWidth: "10ch", valueWidth: "45ch" },
        { label: "ASN:", value: pc.net.asn },
        { label: "ISP:", value: pc.net.isp?.substring(0, 40) },
        { label: "Org:", value: pc.net.org?.substring(0, 40) },
        { label: "Host:", value: String(host), className: "bme-ip-host", title: String(host) },
        { label: "Range:", value: pc.net.range, className: "bme-ip-range", title: pc.net.range },
        { label: "Type:", value: pc.net.type },
    ]
    table.append(
        getPcInfoSection(firstSectionContent),
        getPcInfoSection(secondSectionContent),
        getPcInfoSection(thirdSectionContent)
    );

    element.append(table)
    return element;
}
function getPcInfoSection(rows) {
    const element = document.createElement("div");
    element.classList.add("bme-pc-details-row");
    element.style.setProperty("--width", rows[0].maxWidth);

    for (const row of rows) {
        if (!row.label) continue;

        const rowElement = document.createElement("div");
        rowElement.classList.add("bme-pc-details-column")

        const label = document.createElement("span");
        label.style.setProperty("--width", rows[0].labelWidth)
        label.innerText = row.label;

        const value = document.createElement("span");
        value.style.setProperty("--width", rows[0].valueWidth)
        value.innerText = row.value;
        if (row.className) value.classList.add(row.className);
        if (row.title) value.title = row.title;

        rowElement.append(label, value);
        element.append(rowElement);
    }

    return element;
}
function trueOrFalse(value, redColor, greenColor) {
    const className = value === redColor ? "bme-red-text" : value === greenColor ? "bme-green-text" : null;
    return { value, className }
}
function getScore(value, reverse = false) {
    let color = null;
    if (reverse) color = value > 75 ? "red" : value > 25 ? "yellow" : value >= 0 ? "green" : null;
    else color = value > 75 ? "green" : value > 25 ? "yellow" : value >= 0 ? "red" : null;

    if (!color) return value
    return { value, className: `bme-${color}-text` };
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
export async function addSharedIpNameCheck(bmId, bmProfile) {
    bmProfile = await bmProfile;

    const nonVpnIpIds = new Set(
        bmProfile.included
            .filter(item => {
                if (item.type !== "identifier" || item.attributes?.type !== "ip") return false;
                const conInfo = item.attributes?.metadata?.connectionInfo;
                return !(conInfo?.datacenter || conInfo?.proxy || conInfo?.tor);
            })
            .map(item => item.id)
    );

    const currentPlayerNames = bmProfile.included
        .filter(item => item.type === "identifier" && item.attributes?.type === "name")
        .map(item => item.attributes.identifier)
        .filter(Boolean);

    const identifierWrapper = await getElementWhenAppears("css-11gv980", true);
    const identifierTable = identifierWrapper?.lastChild?.children;
    if (!identifierTable) return console.error("BM-EXTRA: identifierTable is missing!");

    // Shared player links load asynchronously — wait for them
    for (let i = 0; i < 50; i++) {
        if (!document.body.contains(identifierTable[0])) return;
        if (identifierWrapper.innerText.includes("Identifier shared with")) break;
        await new Promise(r => setTimeout(r, 150 * (i / 10 + 1)));
    }

    // Find the IP section header row
    const ipHeaderRow = Array.from(identifierTable).find(row =>
        row.classList.contains("css-147tpna") &&
        row.querySelector("th")?.innerText.trim() === "IP"
    );
    if (!ipHeaderRow) return;

    // Add the COMPARE NAMES button into the IP header <th>
    const ipTh = ipHeaderRow.querySelector("th");
    const analyseBtn = document.createElement("button");
    analyseBtn.classList.add("bme-button", "bme-name-check-btn");
    analyseBtn.textContent = "COMPARE NAMES";
    ipTh.appendChild(analyseBtn);

    // Build the summary row that will appear directly under the IP header
    const summaryRow = document.createElement("tr");
    summaryRow.classList.add("bme-name-check-summary-row");
    summaryRow.style.display = "none";

    const summaryCell = document.createElement("td");
    summaryCell.colSpan = 3;
    summaryRow.appendChild(summaryCell);

    const progressWrapper = document.createElement("div");
    progressWrapper.classList.add("bme-name-check-progress-wrapper");

    const progressTrack = document.createElement("div");
    progressTrack.classList.add("bme-name-check-progress-track");
    const progressFill = document.createElement("div");
    progressFill.classList.add("bme-name-check-progress-fill");
    progressTrack.appendChild(progressFill);

    const progressLabel = document.createElement("div");
    progressLabel.classList.add("bme-name-check-progress-label");

    progressWrapper.append(progressTrack, progressLabel);
    summaryCell.appendChild(progressWrapper);

    const resultsEl = document.createElement("div");
    resultsEl.classList.add("bme-name-check-results");
    summaryCell.appendChild(resultsEl);

    ipHeaderRow.after(summaryRow);

    analyseBtn.addEventListener("click", async () => {
        if (analyseBtn.classList.contains("bme-button-disabled")) return;
        analyseBtn.classList.add("bme-button-disabled");

        summaryRow.style.display = "";
        progressWrapper.style.display = "";
        progressFill.style.width = "0%";
        progressLabel.textContent = "Collecting shared players...";
        resultsEl.innerHTML = "";
        resultsEl.style.display = "none";

        // Collect non-VPN shared player IDs directly from the DOM links
        const sharedPlayerIds = new Set();
        for (const identifier of identifierTable) {
            const { type, id } = getIdentifierType(identifier);
            if (type !== "IP" || !id) continue;
            if (!nonVpnIpIds.has(id)) continue;

            const ol = identifier.children[0]?.querySelector("ol");
            if (!ol) continue;

            for (const li of ol.children) {
                const link = li.querySelector("a");
                if (!link) continue;
                const sharedPlayerId = link.href.split("/").pop();
                if (!sharedPlayerId || isNaN(Number(sharedPlayerId))) continue;
                if (sharedPlayerId !== bmId) sharedPlayerIds.add(sharedPlayerId);
            }
        }

        const playerIdsArr = [...sharedPlayerIds];
        if (!playerIdsArr.length) {
            progressWrapper.style.display = "none";
            resultsEl.textContent = "No shared non-VPN/proxy players found.";
            resultsEl.style.display = "block";
            analyseBtn.classList.remove("bme-button-disabled");
            return;
        }

        // Fetch names for each shared player and score similarity
        const results = [];
        for (let i = 0; i < playerIdsArr.length; i++) {
            const pct = Math.round((i / playerIdsArr.length) * 100);
            progressFill.style.width = `${pct}%`;
            progressLabel.textContent = `${pct}% — Checking account ${i + 1} of ${playerIdsArr.length}`;

            const sharedNames = await fetchPlayerNames(playerIdsArr[i]);
            if (!sharedNames?.length) continue;

            let bestScore = 0;
            let bestCurrentName = null;
            let bestSharedName = null;
            for (const nameA of currentPlayerNames) {
                for (const nameB of sharedNames) {
                    const score = nameSimilarity(nameA, nameB);
                    if (score > bestScore) {
                        bestScore = score;
                        bestCurrentName = nameA;
                        bestSharedName = nameB;
                    }
                }
            }

            if (bestCurrentName !== null) {
                results.push({ playerId: playerIdsArr[i], score: bestScore, currentName: bestCurrentName, sharedName: bestSharedName });
            }
        }

        progressFill.style.width = "100%";
        progressLabel.textContent = "100% — Done.";
        await new Promise(r => setTimeout(r, 400));

        progressWrapper.style.display = "none";
        resultsEl.innerHTML = "";
        resultsEl.style.display = "block";

        if (!results.length) {
            resultsEl.textContent = "No name similarities found across shared IPs.";
            analyseBtn.classList.remove("bme-button-disabled");
            return;
        }

        results.sort((a, b) => b.score - a.score);
        const top5 = results.slice(0, 5);

        const title = document.createElement("div");
        title.classList.add("bme-name-check-title");
        title.textContent = "Top 5 — Most likely same person:";
        resultsEl.appendChild(title);

        for (const match of top5) {
            const matchRow = document.createElement("div");
            matchRow.classList.add("bme-name-check-match");

            const scoreSpan = document.createElement("span");
            scoreSpan.classList.add("bme-name-check-score");
            const colorClass = match.score >= 80 ? "bme-red-text" : match.score >= 50 ? "bme-yellow-text" : "";
            if (colorClass) scoreSpan.classList.add(colorClass);
            scoreSpan.textContent = `${match.score}%`;

            const link = document.createElement("a");
            link.href = `https://www.battlemetrics.com/rcon/players/${match.playerId}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = match.sharedName;

            const vsSpan = document.createElement("span");
            vsSpan.classList.add("bme-name-check-vs");
            vsSpan.textContent = " vs ";

            const currentNameSpan = document.createElement("span");
            currentNameSpan.classList.add("bme-name-check-current");
            currentNameSpan.textContent = match.currentName;

            matchRow.append(scoreSpan, " ", link, vsSpan, currentNameSpan);
            resultsEl.appendChild(matchRow);
        }

        analyseBtn.classList.remove("bme-button-disabled");
    });
}
async function fetchPlayerNames(playerId) {
    try {
        const authToken = localStorage.getItem("BME_BATTLEMETRICS_API_KEY") || getAuthToken();
        if (!authToken) return null;
        const resp = await fetch(`https://api.battlemetrics.com/players/${encodeURIComponent(playerId)}?include=identifier`, {
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (resp.status !== 200) throw new Error(`Status ${resp.status}`);
        const data = await resp.json();
        return data.included
            ?.filter(item => item.type === "identifier" && item.attributes?.type === "name")
            .map(item => item.attributes.identifier)
            .filter(Boolean) ?? [];
    } catch (error) {
        if (!(error instanceof TypeError && error.message === "Failed to fetch"))
            console.error(`BM-EXTRA: ${error}`);
        return null;
    }
}
function nameSimilarity(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a === b) return 100;
    const lenA = a.length;
    const lenB = b.length;
    if (!lenA || !lenB) return 0;
    const dp = [];
    for (let i = 0; i <= lenA; i++) dp[i] = [i];
    for (let j = 0; j <= lenB; j++) dp[0][j] = j;
    for (let i = 1; i <= lenA; i++) {
        for (let j = 1; j <= lenB; j++) {
            if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return Math.round((1 - dp[lenA][lenB] / Math.max(lenA, lenB)) * 100);
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

    const identifierTd = document.createElement("td");
    identifierTd.dataset.title = "Identifier";

    const container = document.createElement("div");
    container.className = "css-8uhtka bme-avatar-container";
    if (zoomable) container.classList.add("bme-zoomable-avatar");
    container.title = item.avatar;

    const placeholder = document.createElement("div");
    placeholder.className = "bme-avatar-placeholder";
    placeholder.appendChild(document.createElement("div"));
    container.appendChild(placeholder);

    const label = document.createElement("span");
    label.className = "css-q39y9k";
    label.title = item.avatar;
    const hitsSuffix = item.avatarHits !== "N/A"
        ? ` | Seen on ${item.avatarHits < 101 ? item.avatarHits : "100+"} players`
        : "";
    label.textContent = `${item.avatar}${hitsSuffix}`;
    container.appendChild(label);

    identifierTd.appendChild(container);

    const typeTd = document.createElement("td");
    typeTd.dataset.title = "Type";
    const typeDiv = document.createElement("div");
    typeDiv.className = "css-18s4qom";
    typeDiv.textContent = "Avatar";
    typeTd.appendChild(typeDiv);

    const lastSeenTd = document.createElement("td");
    lastSeenTd.dataset.title = "Last Seen";

    const dateTime = document.createElement("time");
    dateTime.textContent = `${iso.substring(8, 10)}/${iso.substring(5, 7)}/${iso.substring(0, 4)}`;
    lastSeenTd.appendChild(dateTime);
    lastSeenTd.appendChild(document.createElement("br"));

    const hourTime = document.createElement("time");
    hourTime.className = "css-18s4qom";
    hourTime.textContent = iso.substring(11, 16);
    lastSeenTd.appendChild(hourTime);

    const agoTime = document.createElement("time");
    agoTime.className = "css-18s4qom";
    agoTime.innerHTML = `${getTimeSpan(lastSeen)} ago`;
    lastSeenTd.appendChild(agoTime);

    tr.append(identifierTd, typeTd, lastSeenTd);
    return tr;
}
