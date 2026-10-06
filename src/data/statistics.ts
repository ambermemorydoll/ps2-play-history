import type { PlayHistoryEntry } from "../parser/history";

export interface GameSummary {
  gameId: string;
  gameName: string;
  playCount: number;
  lastPlayed: Date | null;
  records: number;
  hasMaxPlayCount: boolean;
  lookupUrl: URL;
}

export interface OverallSummary {
  records: number;
  recordsSkipped: number;
  uniqueGames: number;
  sessions: number;
  earliestRecord: Date | null;
  latestRecord: Date | null;
  timespan: { years: number; months: number; days: number };
}

const BASE_REDUMP_URL = "http://redump.org/discs/quicksearch/";

export function createGameSummaries(
  entries: PlayHistoryEntry[],
): GameSummary[] {
  const games = new Map<string, GameSummary>();

  for (const entry of entries) {
    if (!entry.gameId) {
      console.log(`Record ${entry.toString()} skipped`);
      continue;
    }

    const existing = games.get(entry.gameId);

    if (!existing) {
      games.set(entry.gameId, {
        gameId: entry.gameId,
        gameName: entry.gameName,
        playCount: entry.playCount,
        lastPlayed: isImpossibleDate(entry.date) ? null : entry.date,
        records: 1,
        hasMaxPlayCount: isMaxPlayCount(entry.playCount),
        lookupUrl: new URL(BASE_REDUMP_URL + entry.gameId.toLowerCase()),
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

export function createOverallSummary(
  entries: PlayHistoryEntry[],
): OverallSummary {
  let totalRecords = 0;
  let skippedRecords = 0;
  let totalSessions = 0;
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;
  const uniqueGameIds = new Set<string>();

  for (const entry of entries) {
    if (!entry.gameId) {
      skippedRecords++;
      continue;
    }

    totalRecords++;
    uniqueGameIds.add(entry.gameId);
    totalSessions += entry.playCount;

    if (!isImpossibleDate(entry.date)) {
      if (earliestDate === null || entry.date < earliestDate) {
        earliestDate = entry.date;
      }
      if (latestDate === null || entry.date > latestDate) {
        latestDate = entry.date;
      }
    }
  }

  const timespan = calculateTimespan(
    earliestDate ?? new Date(2000, 0, 0),
    latestDate ?? new Date(2000, 0, 0),
  );

  return {
    uniqueGames: uniqueGameIds.size,
    records: totalRecords,
    recordsSkipped: skippedRecords,
    sessions: totalSessions,
    earliestRecord: earliestDate,
    latestRecord: latestDate,
    timespan: timespan,
  };
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

function calculateTimespan(
  earliestDate: Date,
  latestDate: Date,
): {
  years: number;
  months: number;
  days: number;
} {
  let years = latestDate.getFullYear() - earliestDate.getFullYear();
  let months = latestDate.getMonth() - earliestDate.getMonth();
  let days = latestDate.getDate() - earliestDate.getDate();

  console.log(`Base delta: ${years} years, ${months} months, ${days} days`);

  // If the day delta is negative (e.g. July 16th to Aug 12th = -3 days) we need to calculate how many days already
  // passed in the previous month (and subtract the month to compensate)
  if (days < 0) {
    months--;

    // Obtain the number of days in the previous month
    const previousMonth = new Date(
      latestDate.getFullYear(),
      latestDate.getMonth(),
      0,
    );

    // Add the resulting number to days to bring it back to a positive number
    days += previousMonth.getDate();
  }

  // Same logic for negative days, but years always have 12 months, so there's no need to do as much calculation
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}
