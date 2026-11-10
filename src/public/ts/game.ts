
// --------------------------------------------------
// GAME ELEMENTS
// --------------------------------------------------

const gameContainer = document.getElementById("gameContainer");
const timerElement = document.getElementById("gameTimer");
const scoreElement = document.getElementById("gameScore");
const foundCountElement = document.getElementById("foundCount");

const gameImage = document.getElementById("gameImage") as HTMLImageElement | null;
const gameImageContainer = document.getElementById("gameImageContainer");
const gameMessage = document.getElementById("gameMessage");

const gameResult = document.getElementById("gameResult");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const finalScore = document.getElementById("finalScore");
const finalTime = document.getElementById("finalTime");

// --------------------------------------------------
// GAME SETTINGS
// --------------------------------------------------

const gameId = gameContainer?.getAttribute("data-game-id");
const startedAt = gameContainer?.getAttribute("data-started-at");

const TIME_LIMIT_SECONDS = 5 * 60;
const POINTS_PER_CHARACTER = 100;

let selectedCharacterId: string | null = null;
let gameFinished = false;
let timeoutRequestSent = false;

// --------------------------------------------------
// TIMER
// --------------------------------------------------

function getElapsedSeconds(): number {
  if (!startedAt) return 0;

  const startTime = new Date(startedAt).getTime();

  return Math.max(
    0,
    Math.floor((Date.now() - startTime) / 1000)
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimer(): void {
  if (!timerElement || gameFinished) return;

  const elapsedSeconds = getElapsedSeconds();

  timerElement.textContent = formatTime(elapsedSeconds);

  if (elapsedSeconds >= TIME_LIMIT_SECONDS) {
    handleTimeout();
  }
}

// --------------------------------------------------
// SCORE
// --------------------------------------------------

function updateScore(foundCount: number): void {
  const score = foundCount * POINTS_PER_CHARACTER;

  if (scoreElement) {
    scoreElement.textContent = String(score);
  }

  if (foundCountElement) {
    foundCountElement.textContent = String(foundCount);
  }
}

// --------------------------------------------------
// GAME RESULT
// --------------------------------------------------

function finishGame(won: boolean, message: string): void {
  if (gameFinished) return;

  gameFinished = true;

  if (gameResult) {
    gameResult.hidden = false;
  }

  if (resultTitle) {
    resultTitle.textContent = won ? "🎉 You Win!" : "⏰ Game Over!";
  }

  if (resultMessage) {
    resultMessage.textContent = message;
  }

  if (finalScore) {
    finalScore.textContent = scoreElement?.textContent ?? "0";
  }

  if (finalTime) {
    finalTime.textContent = formatTime(getElapsedSeconds());
  }

  // Disable all character buttons
  document
    .querySelectorAll<HTMLButtonElement>(".character-item")
    .forEach((button) => {
      button.disabled = true;
    });

  // Stop further image clicks
  if (gameImage) {
    gameImage.style.cursor = "default";
  }

  selectedCharacterId = null;
}

// --------------------------------------------------
// HANDLE TIMEOUT
// --------------------------------------------------

async function handleTimeout(): Promise<void> {
  if (gameFinished || timeoutRequestSent || !gameId) return;

  timeoutRequestSent = true;

  if (gameMessage) {
    gameMessage.textContent = "Time is up! Finishing your game...";
  }

  try {
    const response = await fetch(`/api/games/${gameId}/timeout`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to finish game.");
    }

    updateScore(data.foundCount);

    finishGame(data.won, data.message);
  } catch (error) {
    console.error("Timeout error:", error);

    timeoutRequestSent = false;

    if (gameMessage) {
      gameMessage.textContent = "Unable to save game result. Please try again.";
    }
  }
}

// --------------------------------------------------
// CHARACTER SELECTION
// --------------------------------------------------

const characterButtons =
  document.querySelectorAll<HTMLButtonElement>(".character-item");

characterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (gameFinished || button.disabled) return;

    selectedCharacterId = button.dataset.characterId ?? null;

    // Remove previous selection
    characterButtons.forEach((item) => {
      item.classList.remove("selected");
    });

    // Highlight selected character
    button.classList.add("selected");

    if (gameMessage) {
      gameMessage.textContent =
        `Now find ${button.textContent?.trim()} in the image!`;
    }
  });
});

// --------------------------------------------------
// IMAGE CLICKING AND GUESSING
// --------------------------------------------------

async function submitGuess(x: number, y: number): Promise<void> {
  if (!gameId || !selectedCharacterId || gameFinished) return;

  if (getElapsedSeconds() >= TIME_LIMIT_SECONDS) {
    await handleTimeout();
    return;
  }

  try {
    const response = await fetch(`/api/games/${gameId}/guess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        characterId: selectedCharacterId,
        x,
        y,
      }),
    });

    const data = await response.json();

    if (data.correct) {
      // Mark character as found
      const selectedButton = document.querySelector<HTMLButtonElement>(
        `[data-character-id="${selectedCharacterId}"]`
      );

      if (selectedButton) {
        selectedButton.disabled = true;
        selectedButton.classList.remove("selected");
        selectedButton.classList.add("found");
      }

      const foundCount = Number(data.foundCount);

      updateScore(foundCount);

      if (gameMessage) {
        gameMessage.textContent = data.message;
      }

      selectedCharacterId = null;

      if (data.completed) {
        finishGame(true, data.message);
      }

      return;
    }

    if (data.completed) {
      updateScore(
        Number(foundCountElement?.textContent ?? 0)
      );

      finishGame(Boolean(data.won), data.message);
      return;
    }

    if (gameMessage) {
      gameMessage.textContent = data.message || "Not quite! Try again.";
    }

  } catch (error) {
    console.error("Guess error:", error);

    if (gameMessage) {
      gameMessage.textContent = "Unable to check your guess. Try again.";
    }
  }
}

// --------------------------------------------------
// IMAGE CLICK EVENT
// --------------------------------------------------

gameImageContainer?.addEventListener("click", (event: MouseEvent) => {
  if (gameFinished || !gameImage || !selectedCharacterId) {
    if (!selectedCharacterId && gameMessage && !gameFinished) {
      gameMessage.textContent = "Select a character first!";
    }

    return;
  }

  const rect = gameImage.getBoundingClientRect();

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  // Ignore clicks outside the image
  if (x < 0 || x > 1 || y < 0 || y > 1) return;

  // Create selection marker
  const existingMarker = document.querySelector(".selection-marker");
  existingMarker?.remove();

  const marker = document.createElement("div");

  marker.className = "selection-marker";
  marker.style.left = `${x * 100}%`;
  marker.style.top = `${y * 100}%`;

  gameImageContainer.appendChild(marker);

  // Send guess to the backend
  void submitGuess(x, y);
});

// --------------------------------------------------
// INITIALIZE GAME
// --------------------------------------------------

// Read initial score from the server-rendered page
const initialFoundCount = Number(
  foundCountElement?.textContent ?? 0
);

updateScore(initialFoundCount);

// Start timer
updateTimer();
setInterval(updateTimer, 1000);
