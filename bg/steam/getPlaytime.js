const RUST_APP_ID = 252490;

export async function getPlaytime(SteamToken, SteamID) {
    const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${SteamToken}&steamid=${SteamID}`;
    const response = await fetch(url);
    if (!response.ok) return "Error";

    const json = await response.json();
    const games = json.response.games;

    if (!games?.length) return "Private";
    if (games.every(g => g.playtime_forever === 0)) return "Private";

    const rustGame = games.find(g => g.appid === RUST_APP_ID);
    if (!rustGame) return "Private";

    return Math.round((rustGame.playtime_forever / 60) * 10) / 10;
}
