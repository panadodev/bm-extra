console.log("EXTENSION: bm-extra loaded!")

//Extension should fire/refresh on page change
window.addEventListener("load", () => main(window.location.href))
navigation.addEventListener("navigate", async (event) => {
    main(event.destination.url);
});
//Extension should fire/refresh on page change

async function main(urlString) {
    if (!chrome.runtime?.id) return;

    try {
        const { router } = await import(chrome.runtime.getURL('./modules/page/router.js'));
        const url = new URL(urlString);
        await router(url);
    } catch (err) {
        if (err.message?.includes('Extension context invalidated')) return;
        throw err;
    }
}