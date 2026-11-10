-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageCharacter" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "xMin" DOUBLE PRECISION NOT NULL,
    "yMin" DOUBLE PRECISION NOT NULL,
    "xMax" DOUBLE PRECISION NOT NULL,
    "yMax" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ImageCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "playerName" VARCHAR(40) NOT NULL,
    "imageId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoundCharacter" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "imageCharacterId" TEXT NOT NULL,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoundCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");

-- CreateIndex
CREATE INDEX "ImageCharacter_characterId_idx" ON "ImageCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageCharacter_imageId_characterId_key" ON "ImageCharacter"("imageId", "characterId");

-- CreateIndex
CREATE INDEX "GameSession_imageId_idx" ON "GameSession"("imageId");

-- CreateIndex
CREATE INDEX "GameSession_completedAt_durationMs_idx" ON "GameSession"("completedAt", "durationMs");

-- CreateIndex
CREATE INDEX "FoundCharacter_gameSessionId_idx" ON "FoundCharacter"("gameSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "FoundCharacter_gameSessionId_imageCharacterId_key" ON "FoundCharacter"("gameSessionId", "imageCharacterId");

-- AddForeignKey
ALTER TABLE "ImageCharacter" ADD CONSTRAINT "ImageCharacter_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageCharacter" ADD CONSTRAINT "ImageCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundCharacter" ADD CONSTRAINT "FoundCharacter_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundCharacter" ADD CONSTRAINT "FoundCharacter_imageCharacterId_fkey" FOREIGN KEY ("imageCharacterId") REFERENCES "ImageCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
