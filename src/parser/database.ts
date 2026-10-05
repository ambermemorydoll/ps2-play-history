export async function loadGameDatabase(): Promise<Map<string, string>> {
  const response = await fetch(`${import.meta.env.BASE_URL}/games.csv`);

  if (!response.ok) {
    throw new Error(
      "Failed to load game title database. Please check your internet connection.",
    );
  }

  const text = await response.text();

  const database = new Map<string, string>();

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

    database.set(gameId, gameName);
  }

  return database;
}
