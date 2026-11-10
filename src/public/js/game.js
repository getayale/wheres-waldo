"use strict";
const timerElement = document.getElementById("gameTimer");
let elapsedSeconds = 0;
function updateTimer() {
    elapsedSeconds++;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    if (timerElement) {
        timerElement.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
}
setInterval(updateTimer, 1000);
//# sourceMappingURL=game.js.map