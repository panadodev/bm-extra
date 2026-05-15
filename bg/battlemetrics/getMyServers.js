export async function getMyServers(BMToken) {
    const params = new URLSearchParams({
        "filter[rcon]": "true",
        "page[size]": "100",
        "access_token": BMToken,
    });
    const response = await fetch(`https://api.battlemetrics.com/servers?${params}`);
    if (!response.ok) return undefined;
    return response.json();
}
