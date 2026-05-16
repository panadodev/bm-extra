import { convertDate } from "../other/convertDate.js";
import { getRelativeTime } from "../other/getRelativeTime.js";

const AIM_SERVER_KEYWORDS = ["ukn", "aim"];

function isAimTrainServer(serverName) {
    return AIM_SERVER_KEYWORDS.some(kw => serverName.toLowerCase().includes(kw));
}

function isTrackedServer(server, yourServers) {
    return yourServers?.some(s => s.enabled && s.id == server.id) ?? false;
}

export async function getPlayerInfo(BMToken, BMID, YourServers) {
    const url = `https://api.battlemetrics.com/players/${BMID}?include=server,identifier&fields[server]=name,ip,port`;
    const response = await fetch(url, { headers: { "Authorization": `Bearer ${BMToken}` } });
    if (!response.ok) return undefined;

    const json = await response.json();

    const steamIdentifier = json.included.find(
        inc => inc.type === "identifier" && inc.attributes.type === "steamID"
    );

    const session = { server: "Offline", ip: "-", serverId: "-", joinDate: "-", online: false };
    const playtime = { bm: 0, aimtrain: 0, serverCount: 0, yourServers: 0, inaccurate: false };
    let totalServers = 0;

    for (const entry of json.included) {
        if (entry.type !== "server") continue;
        totalServers++;

        if (entry.relationships.game.data.id !== "rust") continue;

        const hours = entry.meta.timePlayed / 3600;
        playtime.serverCount++;
        playtime.bm += hours;

        if (isAimTrainServer(entry.attributes.name)) playtime.aimtrain += hours;
        if (isTrackedServer(entry, YourServers)) playtime.yourServers += hours;

        if (entry.meta.online) {
            session.online = true;
            session.serverId = entry.id;
            session.server = entry.attributes.name;
            session.ip = `client.connect ${entry.attributes.ip}:${entry.attributes.port}`;
            session.joinDate = getRelativeTime(new Date(entry.meta.lastSeen));
        }
    }

    playtime.bm = playtime.bm.toFixed(1);
    playtime.aimtrain = playtime.aimtrain.toFixed(1);
    playtime.yourServers = playtime.yourServers.toFixed(1);
    playtime.inaccurate = totalServers >= 250;

    return {
        profileCreated: convertDate(new Date(json.data.attributes.createdAt)),
        session,
        playtime,
        rustBans: steamIdentifier.attributes.metadata?.rustBans ?? undefined,
        private: json.data.attributes.private,
    };
}
