import type { GameSummary } from "./statistics";

export function generateCsv(games: GameSummary[]): string {
  if (games.length === 0) return "";

  const headers = [
    "gameId",
    "gameName",
    "gameFormat",
    "playCount",
    "isCapped",
    "lastPlayed",
  ];
  const csvRows = [headers.join(",")];

  const sortedGames = [...games].sort((a, b) =>
    a.gameName.localeCompare(b.gameName),
  );

  for (const game of sortedGames) {
    let values = "";
    values += `"${game.gameId.replace('"', "")}",`;
    values += `"${game.gameName.replace('"', "")}",`;
    values += `${game.gameFormat !== "N/A" ? game.gameFormat : ""},`;
    values += `${game.playCount},`;
    values += `${game.hasMaxPlayCount},`;
    values += game.lastPlayed ? game.lastPlayed.toISOString().slice(0, 10) : "";
    csvRows.push(values);
  }

  return csvRows.join("\n");
}
