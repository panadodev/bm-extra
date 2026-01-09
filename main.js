console.log("EXTENSION: bm-extra loaded!")

//Extension should fire/refresh on page change
window.addEventListener("load", () => main(window.location.href))
navigation.addEventListener("navigate", async (event) => {
    main(event.destination.url);
});
//Extension should fire/refresh on page change

async function main(urlString) {
    const { router } = await import(chrome.runtime.getURL('./modules/page/router.js'));
    
    const url = new URL(urlString);
    router(url);
}