import { isWithin24hours } from "../other/isWithin24hours.js";

const CHEAT_KEYWORDS = ["cheat", "hack", "aim", "wallhack", "wh", "esp", "fly", "head", "vision", "speed"];
const TEAM_KEYWORDS = [" team", "teaming", "teamming", "limit", "rule", "alliance", "max", "group", "duo", "trio", "quad", "squad", "man"];

async function fetchAllActivity(initialUrl, BMToken) {
    const activities = [];
    let nextUrl = initialUrl;
    const init = { headers: { "Authorization": `Bearer ${BMToken}` } };

    while (nextUrl) {
        const response = await fetch(nextUrl, init);
        if (!response.ok) break;

        const json = await response.json();
        activities.push(...json.data);
        nextUrl = json.links?.next ?? null;
    }

    return activities;
}

function classifyReport(text, reportType) {
    if (CHEAT_KEYWORDS.some(w => text.includes(w))) return "cheating";
    if (TEAM_KEYWORDS.some(w => text.includes(w))) return "teaming";
    if (reportType === "cheat") return "cheating";
    return "other";
}

function computeKD(kills, deaths) {
    if (deaths === 0) return kills > 0 ? kills : "-";
    return Math.round((kills / deaths) * 100) / 100;
}

export async function getActivity(BMToken, Arkan, Guardian, BMID) {
    const url = `https://api.battlemetrics.com/activity?tagTypeMode=and&filter[types][blacklist]=event:query&filter[players]=${BMID}&include=organization,user&page[size]=1000`;
    const activities = await fetchAllActivity(url, BMToken);

    const reporters = {
        cheating: new Set(), cheating24h: new Set(),
        teaming: new Set(),  teaming24h:  new Set(),
        other:   new Set(),  other24h:    new Set(),
    };

    let kills = 0, kills24h = 0, deaths = 0, deaths24h = 0;
    let noRecoil = 0, noRecoil24h = 0, aimbot = 0, aimbot24h = 0;
    let guardianCheat = 0, guardianCheat24h = 0, guardianFlood = 0, guardianFlood24h = 0;

    for (const activity of activities) {
        const attrs = activity.attributes;
        const within24h = isWithin24hours(new Date(attrs.timestamp));

        if (attrs.messageType === "rustLog:playerReport" && attrs.data.forPlayerId == BMID) {
            const text = (attrs.data.reason.replace(/\[cheat\]|\[spam\]|\[abusive\]/g, "") + " " + attrs.data.message).toLowerCase();
            const category = classifyReport(text, attrs.data.reportType);
            reporters[category].add(attrs.data.fromPlayerId);
            if (within24h) reporters[`${category}24h`].add(attrs.data.fromPlayerId);

        } else if (attrs.messageType === "rustLog:playerDeath:PVP") {
            if (attrs.data.killer_id == BMID)      { kills++;  if (within24h) kills24h++;  }
            else if (attrs.data.player_id == BMID) { deaths++; if (within24h) deaths24h++; }

        } else if (attrs.messageType === "unknown") {
            if (Arkan) {
                if (attrs.message.startsWith("[Arkan] No Recoil probable violation"))  { noRecoil++; if (within24h) noRecoil24h++; }
                else if (attrs.message.startsWith("[Arkan] AIMBOT probable violation")) { aimbot++;   if (within24h) aimbot24h++;   }
            }
            if (Guardian) {
                if (attrs.message.includes(" for AntiCheat("))      { guardianCheat++; if (within24h) guardianCheat24h++; }
                else if (attrs.message.includes(" for AntiFlood")) { guardianFlood++; if (within24h) guardianFlood24h++; }
            }
        }
    }

    return {
        cheatingReports:     reporters.cheating.size,
        cheatingReports24h:  reporters.cheating24h.size,
        teamingReports:      reporters.teaming.size,
        teamingReports24h:   reporters.teaming24h.size,
        otherReports:        reporters.other.size,
        otherReports24h:     reporters.other24h.size,

        kills, kills24h, deaths, deaths24h,
        kd:    computeKD(kills,    deaths),
        kd24h: computeKD(kills24h, deaths24h),

        noRecoil:        Arkan   ? noRecoil        : undefined,
        noRecoil24h:     Arkan   ? noRecoil24h     : undefined,
        aimbot:          Arkan   ? aimbot           : undefined,
        aimbot24h:       Arkan   ? aimbot24h        : undefined,
        guardianCheat:   Guardian ? guardianCheat   : undefined,
        guardianCheat24h:Guardian ? guardianCheat24h: undefined,
        guardianFlood:   Guardian ? guardianFlood   : undefined,
        guardianFlood24h:Guardian ? guardianFlood24h: undefined,
    };
}
