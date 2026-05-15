import { convertDate } from "../other/convertDate.js";

const VISIBILITY_MAP = {
    0: "Not Configured",
    1: "Private",
    2: "Private",
    3: "Public",
};

export async function getPlayerSummaries(SteamToken, SteamID) {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${SteamToken}&steamids=${SteamID}`;
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const json = await response.json();
    const player = json.response.players[0];
    if (!player) return undefined;

    const stateKey = player.profilestate === 0 ? 0 : player.communityvisibilitystate;
    const visibility = VISIBILITY_MAP[stateKey] ?? "Private";

    const profileCreated = player.timecreated != null
        ? convertDate(new Date(player.timecreated * 1000))
        : "Private";

    return {
        visibility,
        profileCreated,
        avatar: player.avatarmedium,
    };
}
