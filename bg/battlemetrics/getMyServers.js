export async function getMyServers(BMToken) {
    const params = new URLSearchParams({
        "filter[rcon]": "true",
        "page[size]": "100",
    });
    const response = await fetch(`https://api.battlemetrics.com/servers?${params}`, {
        headers: { "Authorization": `Bearer ${BMToken}` }
    });
    if (!response.ok) return undefined;
    return response.json();
}
