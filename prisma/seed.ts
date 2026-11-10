
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Create characters if they do not already exist
  const characters = await Promise.all([
    prisma.character.upsert({
      where: { name: "Waldo" },
      update: {},
      create: { name: "Waldo" },
    }),
    prisma.character.upsert({
      where: { name: "Wenda" },
      update: {},
      create: { name: "Wenda" },
    }),
    prisma.character.upsert({
      where: { name: "Wizard Whitebeard" },
      update: {},
      create: { name: "Wizard Whitebeard" },
    }),
  ]);

  // Game images
  const gameImages = [
    {
      title: "Beach Adventure",
      imageUrl: "/images/beach-adventure.jpg",
    },
    {
      title: "Amusement Park",
      imageUrl: "/images/amusement-park.jpg",
    },
    {
      title: "City Adventure",
      imageUrl: "/images/city-adventure.jpg",
    },
  ];

  for (const gameImage of gameImages) {
    // Find an existing image or create a new one
    let image = await prisma.image.findFirst({
      where: { imageUrl: gameImage.imageUrl },
    });

    if (!image) {
      image = await prisma.image.create({
        data: {
          title: gameImage.title,
          imageUrl: gameImage.imageUrl,
          thumbnailUrl: gameImage.imageUrl,
          width: 2000,
          height: 1400,
        },
      });
    }

    // Connect all three characters to this image
    await prisma.imageCharacter.createMany({
      data: [
        {
          imageId: image.id,
          characterId: characters[0].id,
          xMin: 0.20,
          yMin: 0.30,
          xMax: 0.25,
          yMax: 0.40,
        },
        {
          imageId: image.id,
          characterId: characters[1].id,
          xMin: 0.50,
          yMin: 0.20,
          xMax: 0.55,
          yMax: 0.30,
        },
        {
          imageId: image.id,
          characterId: characters[2].id,
          xMin: 0.70,
          yMin: 0.60,
          xMax: 0.76,
          yMax: 0.72,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log("All three game images created successfully!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
