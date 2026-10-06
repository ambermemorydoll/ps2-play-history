# PS2 Play History Explorer

PS2 Play History Explorer is a React Vite-based web application for parsing and displaying PlayStation 2 game history files. See all your recorded games, cumulative play counts and last played dates alongside optional individual records.

# Try it now at https://ambermemorydoll.github.io/ps2-play-history/!

## Background

### What are game history files?

The PS2 has a secret easter egg involving its [boot animation](https://www.youtube.com/watch?v=y9Ln-qyvX_I) - each of the little towers actually represents a game you've played, with its height determined by the number of times that game has been played. This data is tracked in two files, `history` and `history.old` inside `BxDATA-SYSTEM`, with `x` depending on your console's region. In the console's browser, this is misleadingly named "Your System Configuration" - its only purpose is to store these two history files, all of the actual user-configurable settings are stored in the console's EEPROM data.

### What is the anatomy of these files?

`history` files use a very crude format, the file consists of 22-byte records placed one after another with no header. [sync-on-luma (Y)'s video on YouTube](https://www.youtube.com/watch?v=hjekB5x8uXo) has a very good explanation on the format, but as a quick guide, here's an example row:

`53434553 5F353437 2E343900 00000000 0E210500 1713`

The first 11 bytes indicate the game ID:

`53434553 5F353437 2E3439` decodes to `SCES_547.49` in UTF-8

This internal format is slightly different to how it's printed on the game disc (SCES-54749) so text replacement is necessary to match the ID to a game title database later.

_Technically, 16 bytes are reserved for the game ID - though the only ID I've come across that deviates from the typical format is `DVDVIDEO`. It's possible that some applications (such as the obscure [PS2 Linux distribution](https://en.wikipedia.org/wiki/Linux_for_PlayStation_2) and the Japan-exclusive [PSBBN](https://en.wikipedia.org/wiki/PlayStation_Broadband_Navigator)) or even homebrew might make use of IDs in even more formats, but I'm unable to verify personally._

After the game ID, the 17th byte contains a single integer that caps at 63 per-record:

`0E` indicates `14` plays for this record.

There's two more bytes here that are also influenced by the play count, but their purpose is not known. They are generated via two formulas using the preceding byte, and I've seen them referred to as "tower config" before, but with no clear evidence of what exactly they affect. Regardless, since their only input is the 17th byte, they provide no useful information that we haven't already decoded.

After another padding byte, the 21st and 22nd bytes (`1713`) indicate the date in [MS-DOS format](https://timestamp.tools/tools/dos-timestamp). It omits the last 16 bits used for time, and the base year is 2000 rather than the typical 1980. Admittedly I do not understand this format, but modifying the code on the linked page produces the expected date:

- `const year = (value >> 9) & 0x7f;` returns 9 years after 2000
- `const month = (value >> 5) & 0x0f;` returns 9 (September), but it seemed to be one too high (??) so I subtracted one to decode it as 8 (August)
- `const day = value & 0x1f;` returns 22

There's some logic that moves entries between `history` and `history.old` but I wasn't able to discern how or why (testing this on real hardware is incredibly tedious). This app combines all found records for each game so the distinction shouldn't matter, but the numbers in the 'Records' column are clickable if you'd like to see the individual records.

### What are the limitations of this data?

- **Play count maxes out at 63 per-record.** One byte should be able to store up to 255, but I assume Sony only wanted the towers to have a resolution of 63 (maybe to make it more reasonable for a user to reach maximum towers on their favourite games?). Either way, we can't do anything about this (retro- or pro-actively) so this app communicates to the user when their play count has been capped on one or more records.
- **Most people's PS2 clock batteries have expired by now.** This produces records with a date of 2000-01-01, which overwrites the existing date even if it should be in the future. For this reason, I've chosen to replace all January 2000 dates with `Unknown`, which **intentionally sort as if they are the newest entries.** I did this because, logically, the records made on a dead clock battery are likely to be newer than the ones made when it was working. If a user replaces their clock battery, the correct date will be written again as soon as they relaunch each game.
- **There is no perfect game title database.** I used [GameDB-PSX](https://github.com/niemasd/GameDB-PSX) and [PS2-OPL-CFG](https://github.com/VTSTech/PS2-OPL-CFG) for PS1 and PS2 respectively, but I still had missing entries to add by hand for my sample data. I'm fairly sure PS2 games carry their title in their disc's metadata, so Sony could've stored it in the history files if they desired, but it would've been unnecessary for the purpose it was used for.
- **Some homebrew and backup loaders do not respect this file.** [Open-PS2-Loader](https://github.com/ps2homebrew/Open-PS2-Loader) does, [DKWDRV](https://github.com/DKWDRV/DKWDRV) does not. My own sample data is missing a lot of PS1 play records as I have to use DKWDRV's component fix option to have them display on my TV.

## Features

- **Multi-file import:** open any combination of history files to be processed simultaneously. Multiple regions, multiple memory cards and both `history`/`history.old` files can be imported together.
- **Game ID and title matching:** Retrieves game title where possible, _or:_
- **Manual Redump lookup links:** Search potential matches when database retrieval isn't possible.
- **Column sorting:** Sort by title, ID, cumulative play count, last played date, or number of records.
- **Summary view:** Record counts, unique games played, tracked play sessions, earliest and latest known dates, all in one place.
- **Individual record view:** See source file, dates and play counts for all records processed.
- **Automatic light and dark mode support:** Please consider checking out the dark mode! It's PS2-themed :)
- **Privacy guaranteed:** All processing happens locally. No files are sent to a server.
- **File location tutorial:** Learn how to obtain the history file from your own memory card, _or:_
- **Sample data import:** Click the `Try with sample data` button to test the app with my own memory card data. This data was a surprise even to me, as my memory card has been in use by its previous owners longer than I've been alive!

## Credits

**Special thanks to:**

- [sync-on-luma (y)](https://www.youtube.com/@sync-on-luma) for his excellent [video on reverse-engineering the history files](https://www.youtube.com/watch?v=hjekB5x8uXo) of the PS2.
- [israpps](https://github.com/israpps) for his [research on the PS2's system folders](https://israpps.github.io/FreeMcBoot-Installer/test/10_System_Updates.html) and his [PS2-HistoryTweaker project](https://github.com/israpps/PS2-HistoryTweaker).
- The [GameDB-PSX](https://github.com/niemasd/GameDB-PSX) Database for the PSX.data.tsv file used to match PS1 game IDs with titles.
- The [PS2-OPL-CFG](https://github.com/VTSTech/PS2-OPL-CFG) Database for the PS2-GAMEID-TITLE-MASTER.csv file used to match PS2 game IDs with titles.

**This project is not affiliated with Sony Computer Entertainment or the PlayStation brand in any capacity.**
