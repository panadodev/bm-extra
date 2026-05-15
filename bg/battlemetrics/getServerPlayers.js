export async function getServerPlayers(BMToken, ServerID) {
    const url = `https://api.battlemetrics.com/servers/${ServerID}?include=player,identifier&access_token=${BMToken}`;
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const json = await response.json();
    const included = json.included ?? [];

    const steamEntries = included.filter(
        item => item.type === "identifier" && item.attributes.type === "steamID"
    );

    return steamEntries.map(entry => {
        const bmId = entry.relationships.player.data.id;
        const playerEntry = included.find(item => item.type === "player" && item.id === bmId);
        return {
            SteamID: entry.attributes.identifier,
            BMID: bmId,
            name: playerEntry?.attributes.name ?? "Unknown",
        };
    });
}
