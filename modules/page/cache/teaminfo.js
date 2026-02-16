export const organizations = [];

class BestRust {
    id = "18611";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "edb0be86-6f5e-4e4b-a655-5fcecd4af11f",
                        options: {
                            command: "teaminfo",
                            steamid: steamId,
                            format: " "
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();

        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

class BattleZone {
    id = "29251";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: {
                    type: "rconCommand",
                    attributes: {
                        command: "raw",
                        options: {
                            raw: `teaminfo ${steamId}`
                        }
                    }
                }
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return "error";
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "error";
        }

        return result;
    }
}

/*
class ExampleOrganization {
    id = "1234";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        return "..."; // return the actual raw teaminfo here
    }
}
*/