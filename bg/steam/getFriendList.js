export async function getFriendList(SteamToken, SteamID) {
    const url = `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${SteamToken}&steamid=${SteamID}&relationship=friend`;
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const json = await response.json();
    if (!json.friendslist?.friends) return undefined;

    return json.friendslist.friends.map(f => f.steamid);
}
