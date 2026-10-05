import type { PlayHistoryEntry } from "../parser/history";

export interface GameSummary {
  gameId: string;
  gameName: string;
  playCount: number;
  lastPlayed: Date | null;
  records: number;
  hasMaxPlayCount: boolean;
}

export function createGameSummaries(
  entries: PlayHistoryEntry[],
): GameSummary[] {
  const games = new Map<string, GameSummary>();

  for (const entry of entries) {
    const existing = games.get(entry.gameId);

    if (!existing) {
      games.set(entry.gameId, {
        gameId: entry.gameId,
        gameName: entry.gameName,
        playCount: entry.playCount,
        lastPlayed: isImpossibleDate(entry.date) ? null : entry.date,
        records: 1,
        hasMaxPlayCount: isMaxPlayCount(entry.playCount),
      });

      continue;
    }

    existing.playCount = existing.playCount + entry.playCount;

    if (!isImpossibleDate(entry.date)) {
      if (existing.lastPlayed === null || entry.date > existing.lastPlayed) {
        existing.lastPlayed = entry.date;
      }
    }

    existing.records++;

    if (entry.playCount === 63) {
      existing.hasMaxPlayCount = true;
    }
  }

  return Array.from(games.values());
}

// The history file has a hard limit of 63 play count per record. If this value has been reached by any record,
// it's useful to store that information and inform the user that their true count may be higher than what's
// displayed to them.
function isMaxPlayCount(playCount: number): boolean {
  return playCount === 63;
}

// When a PS2's clock battery dies, the system date reverts to 2000-01-01 every time it is connected to power -
// it isn't possible for consumers to have played the PS2 prior to March 2000, so it's more reasonable to assume
// that January 2000 dates are actually the most recently played. By substituting their dates with null, we can
// later replace them with 'Unknown' so they can be sorted as if they were the newest entries.
function isImpossibleDate(date: Date): boolean {
  return date.getFullYear() === 2000 && date.getMonth() === 0;
}
