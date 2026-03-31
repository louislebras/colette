document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("headerAdTrack");
  if (!track) return;

  const items = track.querySelectorAll(".header-ad-item");
  if (!items.length) return;

  const ITEM_HEIGHT = items[0].offsetHeight;
  const DISPLAY_TIME = 4000; // durée d’affichage (ms)
  const TRANSITION_TIME = 450; // durée de l’animation

  let index = 0;

  // ✅ Clone du premier item pour boucle fluide
  const firstClone = items[0].cloneNode(true);
  track.appendChild(firstClone);

  function nextHeaderAd() {
    index++;
    track.style.transition = `transform ${TRANSITION_TIME}ms ease`;
    track.style.transform = `translateY(-${ITEM_HEIGHT * index}px)`;

    // ✅ Reset propre quand on arrive au clone
    if (index === items.length) {
      setTimeout(() => {
        track.style.transition = "none";
        track.style.transform = "translateY(0)";
        index = 0;
      }, TRANSITION_TIME);
    }
  }

  setInterval(nextHeaderAd, DISPLAY_TIME);
});
