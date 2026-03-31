document.addEventListener("DOMContentLoaded", () => {
  let priceElements = Array.from(document.querySelectorAll(".btc-price"));
  if (priceElements.length === 0) return;

  const socket = new WebSocket("wss://ws.kraken.com/");
  let isClosed = false;

  function updatePriceElements(price) {
    priceElements.forEach((el) => {
      el.textContent =
        "$" + price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    });
  }

  // 📌 Re-scan quand la page est remplacée dynamiquement (SPA)
  document.addEventListener("pageScriptsLoaded", () => {
    priceElements = Array.from(document.querySelectorAll(".btc-price"));
  });

  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({
        event: "subscribe",
        pair: ["XBT/USD"],
        subscription: { name: "ticker" },
      })
    );
  });

  socket.addEventListener("message", (event) => {
    if (isClosed) return;

    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (Array.isArray(data) && data[1] && data[1].c) {
      const price = parseFloat(data[1].c[0]);
      if (!isNaN(price)) updatePriceElements(price);
    }
  });

  // 🔥 Nettoyage automatique si page remplacée
  document.addEventListener("pageContentReplaced", () => {
    isClosed = true;
    socket.close();
  });
});
