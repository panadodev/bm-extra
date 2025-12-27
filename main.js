console.log("EXTENSION: bm-extra loaded!")

//Extension should fire/refresh on page change
window.addEventListener("load", () => main(window.location.href))
navigation.addEventListener("navigate", async (event) => {
    main(event.destination.url);
});
//Extension should fire/refresh on page change

async function main(url) {
    const { router } = await import(chrome.runtime.getURL('./modules/page/router.js'));
    router(url);
}


window.addEventListener("message", async (e) => {
    console.log(e);
    
    if (e.data?.type !== "BME_PC_GET") return;

    const key = `bme-pc-${e.data.ip}`;
    const { [key]: value } = await chrome.storage.session.get(key);

    window.postMessage({ type: "BME_PC_GET_RESOLVED", id: e.data.id, value }, "*");
});
