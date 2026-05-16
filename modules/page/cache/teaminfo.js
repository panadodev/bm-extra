import { talkToBackgroundScript } from "../../misc.js";

export const organizations = [];

class Atlas {
    id = "41737";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        let data;
        try {
            data = await talkToBackgroundScript("BME_ATLAS_TEAMINFO", `${steamId}-${serverId}`, token);
        } catch (e) {
            console.error(`Failed to request teaminfo | Error: ${e.message}`);
            return `ERROR:${e.message}`;
        }

        const result = data?.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result;
        if (!result) {
            console.error(`Failed to request teaminfo | Result: ${result}`);
            return "ERROR:NO_RESULT";
        }

        return result;
    }
}

class BestRust {
    id = "18611";

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const payload = getBrPayload(triggers, steamId);
        const resp = await fetch(`https://api.battlemetrics.com/servers/${serverId}/command`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept-Version": "^0.1.0"
            },
            body: JSON.stringify({
                data: payload,
            })
        })

        if (resp.status !== 200) {
            console.error(`Failed to request teaminfo | Status: ${resp.status}`);
            return `ERROR:${resp.status}`;
        }

        const data = await resp.json();

        const result = data.data?.attributes?.result[0]?.children[1]?.children[0]?.children[0]?.reference.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "ERROR:NO_RESULT";
        }

        return result;

        function getBrPayload(triggers, steamId) {
            if (triggers.includes("edb0be86-6f5e-4e4b-a655-5fcecd4af11f")) {
                return {
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
            } else if (triggers.includes("4cc932cc-8a86-440f-95aa-d8d99a8ac6ec")) {
                return {
                    type: "rconCommand",
                    attributes: {
                        command: "4cc932cc-8a86-440f-95aa-d8d99a8ac6ec",
                        options: {
                            command: "teaminfo",
                            steamid: steamId,
                        }
                    }
                }

            }
        }
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
            return `ERROR:${resp.status}`;
        }

        const data = await resp.json();
        const result = data.data?.attributes?.result
        if (!result) {
            console.error(`Failed to request teaminfo | Status: ${resp.status} | Result: ${result}`);
            return "ERROR:NO_RESULT";
        }

        return result;
    }
}

class Willjums {
    id = "30126";

    /*
    {
        teamId: string | number,  // Team ID (or -1/"error" for error states)
        members: [
            {
            steamId: string,           // Required - Steam ID of team member
            online: boolean,           // Optional - Whether player is online
            lastSeen: number,          // Optional - Unix timestamp in seconds
            firstSeen: number,         // Optional - Unix timestamp in seconds
            since: number,             // Optional - Unix timestamp in seconds
            leader: boolean,           // Optional - Whether player is team leader
            origin: string,            // Optional - "origin" or "friend"
            }
        ],
        server: string,   // Server name (displayed in header)
        raw: string       // Raw teaminfo data (for copy button functionality)
        }
    */

    static {
        organizations.push(new this());
    }

    async getTeamInfo(steamId, serverId, token) {
        const apiUrl = localStorage.getItem("BME_TEAMINFO_API_URL");
        if (!apiUrl) {
            console.error("Teaminfo API URL is not configured");
            return "ERROR:NO_API_URL";
        }

        try {
            if (new URL(apiUrl).protocol !== "https:") throw new Error("scheme");
        } catch {
            console.error("Teaminfo API URL must be https");
            return "ERROR:INVALID_API_URL";
        }

        const apiToken = localStorage.getItem("BME_TEAMINFO_API_TOKEN");
        if (!apiToken) {
            console.error("Teaminfo API Token is not configured");
            return "ERROR:NO_API_TOKEN";
        }

        let data;
        try {
            data = await talkToBackgroundScript("BME_WILLJUMS_TEAMINFO", `${steamId}-${serverId}-${apiUrl}`, apiToken);
        } catch (e) {
            console.error(`Failed to request teaminfo | Error: ${e.message}`);
            return `ERROR:${e.message}`;
        }

        const result = data?.raw;
        if (!result) {
            console.error(`Failed to request teaminfo | Result: ${result}`);
            return "ERROR:NO_RESULT";
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
