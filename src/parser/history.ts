import { type DatabaseEntry } from "./database";

export interface PlayHistoryEntry {
  sourceFile: string;
  gameId: string;
  gameName: string;
  gameFormat: string;
  playCount: number;
  date: Date;
  rawData: Uint8Array<ArrayBuffer>;
}

const ENTRY_SIZE = 22;

function decodeGameId(entry: Uint8Array): string {
  // Extract first 12 bytes of entry as UTF-8. Technically
  // the title field extends to byte 15, but typical game IDs
  // (XXXX_000.00) only require 12 bytes.
  // (expanded to 13 because Redump says PSRM-017100 exists -
  // supposedly a pre-production internal serial for Syphon Filter
  // 2 (Disc 2))
  const decoder = new TextDecoder("utf-8");
  let gameId = decoder.decode(entry.slice(0, 12));

  // Convert internal title ID to match format as used on game discs.
  // Also strip unwanted characters, necessary to avoid NULL
  // bytes in IDs shorter than 12 bytes (e.g. DVDVIDEO).
  gameId = gameId
    .replace(/_/g, "-")
    .replace(/\./g, "")
    .replace(/[^a-zA-Z0-9\._\-:]/g, "");

  return gameId;
}

function decodePlayCount(entry: Uint8Array): number {
  // Extract byte 16 as an integer. The following two bytes are also influenced by
  // play count, but do not appear to provide any information beyond the integer
  // we already received from byte 16.
  return entry[16];
}

export function decodeTimestamp(entry: Uint8Array): Date {
  // Some variation of MS-DOS date format - extract bytes 20 and 21 and interpret as date.
  const value = entry[20] | (entry[21] << 8);

  const year = (value >> 9) & 0x7f; // Interpret first 7 bits as years since 2000
  const month = (value >> 5) & 0x0f; // Interpret following 4 bits as month
  const day = value & 0x1f; // Interpret final 5 bits as day

  return new Date(2000 + year, month - 1, day);
}

export function parseHistory(
  buffer: ArrayBuffer,
  sourceFile: string,
  gameDatabase: Map<string, DatabaseEntry>,
): PlayHistoryEntry[] {
  // Sanity checks on selected file - check that it's not empty and is a multiple
  // of 22 bytes. This does mean that any arbitrary file has a 1/22 chance of
  // being accepted, but the history file's minimal structure doesn't leave much
  // else to reasonably check for.
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    throw new Error(
      "Unsupported file type. Please check that you have uploaded the correct file(s).",
    );
  }
  if (bytes.length % ENTRY_SIZE !== 0) {
    throw new Error(
      "Unsupported file type. Please check that you have uploaded the correct file(s).",
    );
  }
  const entries: PlayHistoryEntry[] = [];

  // Split file into 22-byte entries
  for (
    let offset = 0;
    offset + ENTRY_SIZE <= bytes.length;
    offset += ENTRY_SIZE
  ) {
    const rawData = bytes.slice(offset, offset + ENTRY_SIZE);

    const gameId = decodeGameId(rawData);
    const gameName =
      gameDatabase.get(gameId)?.gameName ?? `Unknown (${gameId})`;
    const gameFormat = gameDatabase.get(gameId)?.gameFormat ?? "N/A";
    const playCount = decodePlayCount(rawData);
    const date = decodeTimestamp(rawData);

    entries.push({
      sourceFile,
      gameId,
      gameName,
      gameFormat,
      playCount,
      date,
      rawData,
    });
  }

  return entries;
}

// export function uint8ToBinary(uint8: Uint8Array<ArrayBuffer>): string {
//   let binaryParts: string[] = new Array(uint8.length);

//   for (let i = 0; i < uint8.length; i++) {
//     binaryParts[i] = uint8[i].toString(2).padStart(8, "0");
//   }

//   return binaryParts.join("");
// }

export function uint8ToHex(uint8: Uint8Array<ArrayBuffer>): string {
  return Array.from(uint8)
    .map((i) => i.toString(16).padStart(2, "0"))
    .join("");
}
