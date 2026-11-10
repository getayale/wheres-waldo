
import express from "express";
import cors from "cors";
import path from "node:path";
import prisma from "./config/prisma";

const app = express();

// Game settings
const TIME_LIMIT_MS = 5 * 60 * 1000;
const POINTS_PER_CHARACTER = 100;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS configuration
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src/views"));

// Serve CSS, JavaScript, and images
app.use(express.static(path.join(process.cwd(), "src/public")));

// --------------------------------------------------
// HOME PAGE
// --------------------------------------------------

app.get("/", async (_req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        thumbnailUrl: true,
      },
    });

    res.render("index", { images });
  } catch (error) {
    console.error("Unable to load homepage:", error);
    res.status(500).send("Unable to load homepage.");
  }
});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "Where's Waldo server is running!",
  });
});

// --------------------------------------------------
// DATABASE HEALTH CHECK
// --------------------------------------------------

app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT NOW() AS current_time`;

    res.json({
      status: "OK",
      message: "Database connection successful!",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed.",
    });
  }
});

// --------------------------------------------------
// GET ALL ACTIVE GAME IMAGES
// --------------------------------------------------

app.get("/api/images", async (_req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        characters: {
          select: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json(images);
  } catch (error) {
    console.error("Unable to retrieve images:", error);

    res.status(500).json({
      message: "Unable to retrieve game images.",
    });
  }
});

// --------------------------------------------------
// CREATE GAME THROUGH API
// --------------------------------------------------

app.post("/api/games", async (req, res) => {
  try {
    const { playerName, imageId } = req.body ?? {};

    if (
      typeof playerName !== "string" ||
      !playerName.trim() ||
      playerName.trim().length > 40
    ) {
      res.status(400).json({
        message: "Player name must be between 1 and 40 characters.",
      });
      return;
    }

    if (typeof imageId !== "string" || !imageId.trim()) {
      res.status(400).json({
        message: "A valid image ID is required.",
      });
      return;
    }

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        isActive: true,
      },
    });

    if (!image) {
      res.status(404).json({
        message: "Game image not found.",
      });
      return;
    }

    const game = await prisma.gameSession.create({
      data: {
        playerName: playerName.trim(),
        imageId: image.id,
      },
    });

    res.status(201).json({
      message: "Game created successfully!",
      game: {
        id: game.id,
        playerName: game.playerName,
        imageId: game.imageId,
        startedAt: game.startedAt,
      },
    });
  } catch (error) {
    console.error("Unable to create game:", error);

    res.status(500).json({
      message: "Unable to create game.",
    });
  }
});

// --------------------------------------------------
// GAME INTRODUCTION PAGE
// --------------------------------------------------

app.get("/games/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        width: true,
        height: true,
        characters: {
          select: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!image) {
      res.status(404).send("Game image not found.");
      return;
    }

    res.render("game", { image });
  } catch (error) {
    console.error("Unable to load game:", error);

    res.status(500).send("Unable to load game.");
  }
});

// --------------------------------------------------
// START GAME
// --------------------------------------------------

app.post("/games/:imageId/start", async (req, res) => {
  try {
    const { imageId } = req.params;
    const { playerName } = req.body ?? {};

    if (
      typeof playerName !== "string" ||
      !playerName.trim() ||
      playerName.trim().length > 40
    ) {
      res.status(400).send(
        "Player name must be between 1 and 40 characters."
      );
      return;
    }

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        isActive: true,
      },
    });

    if (!image) {
      res.status(404).send("Game image not found.");
      return;
    }

    const game = await prisma.gameSession.create({
      data: {
        playerName: playerName.trim(),
        imageId: image.id,
      },
    });

    res.redirect(
      `/games/${image.id}/play?gameId=${game.id}`
    );
  } catch (error) {
    console.error("Unable to start game:", error);

    res.status(500).send("Unable to start game.");
  }
});

// --------------------------------------------------
// PLAY GAME PAGE
// --------------------------------------------------

app.get("/games/:imageId/play", async (req, res) => {
  try {
    const { imageId } = req.params;
    const gameId = req.query.gameId;

    if (typeof gameId !== "string" || !gameId.trim()) {
      res.status(400).send("A valid game ID is required.");
      return;
    }

    const game = await prisma.gameSession.findFirst({
      where: {
        id: gameId,
        imageId,
      },
      include: {
        image: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            width: true,
            height: true,
            characters: {
              select: {
                character: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        foundCharacters: true,
      },
    });

    if (!game) {
      res.status(404).send("Game session not found.");
      return;
    }

    const foundCount = game.foundCharacters.length;
    const totalCharacters = game.image.characters.length;

    const gameFinished = game.completedAt !== null;

    const gameWon =
      gameFinished && foundCount === totalCharacters;

    const gameLost =
      gameFinished && !gameWon;

    res.render("play", {
      game,
      image: game.image,
      foundCount,
      totalCharacters,
      score: foundCount * POINTS_PER_CHARACTER,
      gameFinished,
      gameWon,
      gameLost,
      timeLimitSeconds: TIME_LIMIT_MS / 1000,
    });
  } catch (error) {
    console.error("Unable to load playable game:", error);

    res.status(500).send("Unable to load game.");
  }
});

// --------------------------------------------------
// LEADERBOARD
// --------------------------------------------------

app.get("/leaderboard", async (_req, res) => {
  try {
    const completedGames = await prisma.gameSession.findMany({
      where: {
        completedAt: { not: null },
        durationMs: { not: null },
      },
      orderBy: {
        durationMs: "asc",
      },
      include: {
        image: {
          select: {
            title: true,
            characters: {
              select: {
                id: true,
              },
            },
          },
        },
        foundCharacters: {
          select: {
            id: true,
          },
        },
      },
      take: 1000,
    });

    // Only players who found every character are winners.
    const games = completedGames
      .filter(
        (game) =>
          game.foundCharacters.length ===
          game.image.characters.length
      )
      .slice(0, 20);

    res.render("leaderboard", { games });
  } catch (error) {
    console.error("Unable to load leaderboard:", error);

    res.status(500).send("Unable to load leaderboard.");
  }
});

// --------------------------------------------------
// CHARACTER GUESS API
// --------------------------------------------------

app.post("/api/games/:gameId/guess", async (req, res) => {
  try {
    const { gameId } = req.params;
    const { characterId, x, y } = req.body ?? {};

    // Validate character ID
    if (
      typeof characterId !== "string" ||
      !characterId.trim()
    ) {
      res.status(400).json({
        message: "A valid character ID is required.",
      });
      return;
    }

    // Validate coordinates
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 1 ||
      y < 0 ||
      y > 1
    ) {
      res.status(400).json({
        message: "Invalid image coordinates.",
      });
      return;
    }

    // Find game
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      res.status(404).json({
        message: "Game session not found.",
      });
      return;
    }

    // Check whether the game has already ended
    if (game.completedAt) {
      const foundCount = await prisma.foundCharacter.count({
        where: { gameSessionId: gameId },
      });

      const totalCharacters = await prisma.imageCharacter.count({
        where: { imageId: game.imageId },
      });

      const won = foundCount === totalCharacters;

      res.status(409).json({
        correct: false,
        completed: true,
        won,
        score: foundCount * POINTS_PER_CHARACTER,
        message: won
          ? "You have already won this game!"
          : "This game has already ended.",
      });
      return;
    }

    // Check time limit on the server
    const now = new Date();
    const elapsedMs = now.getTime() - game.startedAt.getTime();

    if (elapsedMs >= TIME_LIMIT_MS) {
      const updatedGame = await prisma.gameSession.update({
        where: { id: gameId },
        data: {
          completedAt: now,
          durationMs: Math.max(0, elapsedMs),
        },
      });

      res.status(200).json({
        correct: false,
        completed: true,
        won: false,
        score: await prisma.foundCharacter.count({
          where: { gameSessionId: gameId },
        }).then((count) => count * POINTS_PER_CHARACTER),
        message: "Time is up! You lost the game.",
      });
      return;
    }

    // Find the target character for this image
    const target = await prisma.imageCharacter.findFirst({
      where: {
        imageId: game.imageId,
        characterId,
      },
    });

    if (!target) {
      res.status(404).json({
        message: "Character not found in this image.",
      });
      return;
    }

    // Check whether the character was already found
    const alreadyFound = await prisma.foundCharacter.findUnique({
      where: {
        gameSessionId_imageCharacterId: {
          gameSessionId: gameId,
          imageCharacterId: target.id,
        },
      },
    });

    if (alreadyFound) {
      res.status(409).json({
        correct: false,
        message: "You have already found this character!",
      });
      return;
    }

    // Validate the clicked position against the target area
    const isCorrect =
      x >= target.xMin &&
      x <= target.xMax &&
      y >= target.yMin &&
      y <= target.yMax;

    if (!isCorrect) {
      res.status(200).json({
        correct: false,
        completed: false,
        message: "Not quite! Try again.",
      });
      return;
    }

    // Save the correctly found character
    await prisma.foundCharacter.create({
      data: {
        gameSessionId: gameId,
        imageCharacterId: target.id,
      },
    });

    // Calculate score and progress
    const foundCount = await prisma.foundCharacter.count({
      where: { gameSessionId: gameId },
    });

    const totalCharacters = await prisma.imageCharacter.count({
      where: { imageId: game.imageId },
    });

    const score = foundCount * POINTS_PER_CHARACTER;
    const isCompleted = foundCount === totalCharacters;

    // Finish game if every character has been found
    if (isCompleted) {
      const completedAt = new Date();
      const durationMs =
        completedAt.getTime() - game.startedAt.getTime();

      await prisma.gameSession.update({
        where: { id: gameId },
        data: {
          completedAt,
          durationMs,
        },
      });
    }

    res.status(200).json({
      correct: true,
      completed: isCompleted,
      won: isCompleted,
      foundCount,
      totalCharacters,
      score,
      message: isCompleted
        ? "Congratulations! You found every character!"
        : "Correct! You found the character.",
    });
  } catch (error) {
    console.error("Unable to process guess:", error);

    res.status(500).json({
      message: "Unable to process your guess.",
    });
  }
});

// --------------------------------------------------
// GAME TIMEOUT API
// --------------------------------------------------

app.post("/api/games/:gameId/timeout", async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      res.status(404).json({
        message: "Game session not found.",
      });
      return;
    }

    const foundCount = await prisma.foundCharacter.count({
      where: { gameSessionId: gameId },
    });

    const totalCharacters = await prisma.imageCharacter.count({
      where: { imageId: game.imageId },
    });

    const won = foundCount === totalCharacters;

    // Do not finish a game before the time limit
    const now = new Date();
    const elapsedMs = now.getTime() - game.startedAt.getTime();

    if (!game.completedAt && elapsedMs < TIME_LIMIT_MS) {
      res.status(400).json({
        message: "The game time limit has not been reached.",
      });
      return;
    }

    // Save the game result if it is not already completed
    if (!game.completedAt) {
      await prisma.gameSession.update({
        where: { id: gameId },
        data: {
          completedAt: now,
          durationMs: Math.max(0, elapsedMs),
        },
      });
    }

    res.status(200).json({
      completed: true,
      won,
      foundCount,
      totalCharacters,
      score: foundCount * POINTS_PER_CHARACTER,
      message: won
        ? "Congratulations! You won!"
        : "Time is up! You lost the game.",
    });
  } catch (error) {
    console.error("Unable to process game timeout:", error);

    res.status(500).json({
      message: "Unable to process game timeout.",
    });
  }
});

export default app;
