export interface DatabaseEntry {
  gameName: string;
  gameFormat: string;
}

export async function loadGameDatabase(): Promise<Map<string, DatabaseEntry>> {
  let response: Response;

  try {
    response = await fetch(`${import.meta.env.BASE_URL}/games.csv`);
  } catch (err) {
    console.log(`Couldn't download game database: ${err}`);
    throw new Error(
      "Failed to load game title database. Please check your internet connection.",
    );
  }

  if (!response.ok) {
    throw new Error(
      "Failed to load game title database. Please check your internet connection.",
    );
  }

  const text = await response.text();

  const database = new Map<string, DatabaseEntry>();

  let currentFormat = "PS2";

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const columns = line.split(";");

    if (columns.length < 2) {
      continue;
    }

    const gameId = columns[0].trim();
    const gameName = columns[1].trim();
    const gameFormat = currentFormat;

    // Determine where the DVD player entry is - it's the last PS2 title in
    // the database, so anything past this should be a PS1 title
    if (columns[0] === "DVDVIDEO") {
      currentFormat = "PS1";
    }

    database.set(gameId, { gameName, gameFormat });
  }

  return database;
}
