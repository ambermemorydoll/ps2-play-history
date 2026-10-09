import { useState } from "react";
import { createShareSummary, generateShareImage } from "./data/share";
import {
  createGameSummaries,
  createOverallSummary,
  findTopGames,
  type GameSummary,
  type OverallSummary,
} from "./data/statistics";
import { loadGameDatabase } from "./parser/database";
import { parseHistory, type PlayHistoryEntry } from "./parser/history";
import "./App.css";

const APP_URL = "https://ambermemorydoll.github.io/ps2-play-history/";

function App() {
  // States
  const [entries, setEntries] = useState<PlayHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<
    | "gameName"
    | "gameId"
    | "playCount"
    | "firstPlayed"
    | "lastPlayed"
    | "records"
  >("gameName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSampleData, setIsSampleData] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [isDatabaseLoading, setIsDatabaseLoading] = useState(false);
  const [summary, setSummary] = useState<OverallSummary | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState<string | null>(null);
  const [recentlyCopied, setRecentlyCopied] = useState(false);
  const [shareImageFile, setShareImageFile] = useState<File | null>(null); // Image as .png file, used for downloading and sharing
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null); // Image as link to local .png file, used for preview and downloading
  const [shareTab, setShareTab] = useState<number>(0); // Which share tab is in use
  const [shareImagePossible, setShareImagePossible] = useState(false); // Whether the Share Image button should be displayed
  const [shareTextPossible, setShareTextPossible] = useState(false); // Whether the Share Text button should be displayed

  async function loadHistoryFiles(files: File[]) {
    setError(null);
    setShareImageFile(null);
    setShareImageUrl(null);

    if (files.length === 0) {
      return;
    }

    // Attempt all operations on uploaded files - if any fail, assume
    // unsupported file
    try {
      const allEntries: PlayHistoryEntry[] = [];

      setIsDatabaseLoading(true);
      const gameDatabase = await loadGameDatabase();
      setIsDatabaseLoading(false);

      for (const file of files) {
        // Hardcoded skip for .sys files, as icon.sys is present by default
        // in the same folder as the history files and easy to upload by
        // accident
        if (file.name.endsWith(".sys")) {
          console.log("Skipped .sys file");
          continue;
        }

        const buffer = await file.arrayBuffer();

        const parsed = parseHistory(buffer, file.name, gameDatabase);

        allEntries.push(...parsed);
      }

      setEntries(allEntries);
      setGames(createGameSummaries(allEntries));
      setSummary(createOverallSummary(allEntries));
    } catch (err) {
      setIsDatabaseLoading(false);
      console.error(err);
      setError(`${String(err).replace(/Error:/, "")}`);
    }
  }

  // Handles files submitted with the import dialog. handleSampleData()
  // skips this function, so it's safe to assume we are not using sample
  // data
  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    setIsSampleData(false);
    loadHistoryFiles(files);
  }

  // Load sample data files from public folder
  async function handleSampleData() {
    try {
      const fileNames = [
        "ba.history",
        "ba.history.old",
        "be.history",
        "be.history.old",
      ];

      const files = await Promise.all(
        fileNames.map(async (fileName) => {
          const response = await fetch(
            `${import.meta.env.BASE_URL}sample/${fileName}`,
          );

          if (!response.ok) {
            throw new Error(`Failed to load file: ${fileName}`);
          }

          const blob = await response.blob();

          return new File([blob], fileName);
        }),
      );

      setIsSampleData(true);
      await loadHistoryFiles(files);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to load sample data. Please check your internet connection.",
      );
    }
  }

  // Handles sort mode changes
  function handleSort(
    column:
      | "gameName"
      | "gameId"
      | "playCount"
      | "firstPlayed"
      | "lastPlayed"
      | "records",
  ) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    const defaultDirections: Record<typeof column, "asc" | "desc"> = {
      gameName: "asc",
      gameId: "asc",
      playCount: "desc",
      firstPlayed: "asc",
      lastPlayed: "desc",
      records: "desc",
    };

    setSortColumn(column);
    setSortDirection(defaultDirections[column]);
  }

  // ---------- Universal sharing functions ----------

  async function openShareWindow() {
    let topGames = findTopGames(games);

    // Generate and store share summary text
    setShareText(retrieveShareText(topGames));

    if (summary) {
      // Show the share window, but hide share image button until confirmed ready
      setShowShare(true);
      setShareImagePossible(false);

      const shareImageBlob = await generateShareImage(summary, topGames);

      if (shareImageBlob) {
        // Generate saveable file from image blob for downloading
        const imageFile = createShareImageFile(shareImageBlob);
        setShareImageFile(imageFile);

        // Make image URL for preview display in the Share window
        const imageUrl = URL.createObjectURL(shareImageBlob);
        setShareImageUrl(imageUrl);
      }
    }
  }

  // --------- Image sharing functions, in order of operation ----------

  // Creates a .png file from raw image data
  function createShareImageFile(imageBlob: Blob): File {
    const imageFile = new File([imageBlob], "ps2-play-history.png", {
      type: "image/png",
    });
    /*Determine whether image can be shared on this device
    (Why is navigator.canShare() not available without HTTPS? I treated it
    as a check whether sharing was available (assuming HTTP contexts would
    just return false), but got null instead, which was a huge headache to
    troubleshoot on mobile...)*/
    setShareImagePossible(
      navigator.canShare
        ? imageFile !== null && navigator.canShare({ files: [imageFile] })
        : false,
    );
    return imageFile;
  }

  // Opens a direct image link in a new tab. I don't think there's any way to suggest a browser to download
  // an image instead of displaying it?
  function downloadShareImage() {
    if (shareImageUrl) {
      window.open(shareImageUrl);
    } else {
      throw new Error("No image available to download");
    }
  }

  // Opens the device's native share dialog and passes image file as .png
  function openImageShareDialog() {
    if (shareImageFile) {
      navigator.share({ files: [shareImageFile] });
    } else {
      throw new Error("No image available to share");
    }
  }

  // ---------- Text sharing functions, in order of operation ----------

  // Generates and returns share text using function imported from statistics.ts
  function retrieveShareText(topGames: GameSummary[]): string | null {
    if (summary && topGames) {
      const shareSummary = createShareSummary(summary, topGames);
      // Determine whether text can be shared on this device
      setShareTextPossible(
        navigator.canShare
          ? navigator.canShare({ text: shareText + `\n\nvia ${APP_URL}` })
          : false,
      );
      return shareSummary;
    } else {
      return null;
    }
  }

  // Formats existing shareText for displaying in the preview box
  function handleShareDisplay(): string {
    return shareText
      ? `${shareText} \n\nvia ${APP_URL}`
      : "Unable to generate share text";
  }

  // Copies existing shareText to clipboard
  // Share options are already hidden if shareText is null, so no need to check here
  async function handleShareTextCopy() {
    try {
      await navigator.clipboard.writeText(shareText + `\n\nvia ${APP_URL}`);
      // Make the copy button display "Copied!" for two seconds
      setRecentlyCopied(true);
      setTimeout(() => {
        setRecentlyCopied(false);
      }, 2000);
    } catch (err) {
      console.log(`Couldn't copy share summary: ${err}`);
    }
  }

  function handleShareTextDialog() {
    if (shareText) {
      navigator.share({ text: shareText + `\n\nvia ${APP_URL}` });
    } else {
      throw new Error("No text available to share");
    }
  }

  // Builds Twitter link using existing shareText and opens in browser
  // Share options are already hidden if shareText is null, so no need to check here
  function handleShareTextTwitter() {
    let shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + "\n\nvia")}&url=${encodeURIComponent(APP_URL)}`;
    window.open(shareLink);
  }

  // Handles filtering changes when search bar contents are modified
  const filteredGames = games.filter((game) => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return true;
    }

    return (
      game.gameName.toLowerCase().includes(query) ||
      game.gameId.toLowerCase().includes(query)
    );
  });

  // Handles comparisons for game sorting
  const sortedGames = [...filteredGames].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case "gameName":
        comparison = a.gameName.localeCompare(b.gameName);
        break;

      case "gameId":
        comparison = a.gameId.localeCompare(b.gameId);
        break;

      case "playCount":
        comparison = a.playCount - b.playCount;
        break;

      // Makes sure that null dates sort as if they are the newest entries -
      // it makes sense to interpret them this way as they are likely the
      // result of a dead clock battery
      case "lastPlayed":
        if (a.lastPlayed === null && b.lastPlayed === null) {
          comparison = 0;
        } else if (a.lastPlayed === null) {
          comparison = 1;
        } else if (b.lastPlayed === null) {
          comparison = -1;
        } else {
          comparison = a.lastPlayed.getTime() - b.lastPlayed.getTime();
        }
        break;

      case "records":
        comparison = a.records - b.records;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    // HTML page layout
    <main>
      <h1>PS2 Play History Explorer</h1>
      <div>
        <p>
          Import any number of <code>history</code> or <code>history.old</code>{" "}
          files to begin.
        </p>

        <div>
          <input type="file" multiple onChange={handleFiles} />
        </div>

        {isDatabaseLoading && (
          <div>
            <p>
              <strong>
                Loading game title database. If this message remains for more
                than a few moments, try reloading the page.
              </strong>
            </p>
          </div>
        )}

        {error && <p>{error}</p>}

        <br />

        <button type="button" onClick={() => setShowTutorial(true)}>
          <strong>How to obtain history file?</strong>
        </button>
      </div>
      <br />
      {entries.length === 0 && (
        <button type="button" onClick={handleSampleData}>
          <strong>Try with sample data</strong>
        </button>
      )}
      {games.length > 0 && (
        <>
          {isSampleData && (
            <p className="sample-data-notice">
              Displaying sample data from{" "}
              <a
                href="https://github.com/ambermemorydoll"
                target="_blank"
                rel="noopener noreferrer"
              >
                Amber
              </a>
              's own memory card. It's been in use since 2002, in the hands of
              3-4 different owners! Import your own file to clear the displayed
              data.
            </p>
          )}

          {summary && (
            <section className="summary">
              <div>
                {summary.records} records processed{" "}
                {summary.recordsSkipped > 0
                  ? `(${summary.recordsSkipped} invalid)`
                  : ""}
              </div>
              <div>{summary.uniqueGames} unique games played</div>
              <div>{summary.sessions} tracked play sessions</div>
              <div>
                Earliest record:{" "}
                {summary.earliestRecord
                  ? summary.earliestRecord.toISOString().slice(0, 10)
                  : "Unknown"}
              </div>
              <div>
                Latest record:{" "}
                {summary.latestRecord
                  ? summary.latestRecord.toISOString().slice(0, 10)
                  : "Unknown"}
              </div>
              <div>
                Timespan:{" "}
                {summary.timespan.years > 0
                  ? `${summary.timespan.years} years, `
                  : ""}
                {summary.timespan.months > 0 || summary.timespan.years > 0
                  ? `${summary.timespan.months} months, `
                  : ""}
                {`${summary.timespan.days} days`}
              </div>
              {!isSampleData && summary.uniqueGames > 0 && (
                <button type="button" onClick={openShareWindow}>
                  <strong>Share</strong>
                </button>
              )}
            </section>
          )}

          <br />

          <div>
            <label htmlFor="game-search">Search games:</label>

            <input
              id="game-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Game title or ID"
            />
          </div>
          <h2>
            {filteredGames.length} of {games.length} games
          </h2>

          {!selectedGameId && games.length > 0 && (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          onClick={() => handleSort("gameName")}
                        >
                          Game
                          {sortColumn === "gameName" &&
                            (sortDirection === "asc" ? " ↑" : " ↓")}
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          onClick={() => handleSort("gameId")}
                        >
                          ID
                          {sortColumn === "gameId" &&
                            (sortDirection === "asc" ? " ↑" : " ↓")}
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          onClick={() => handleSort("playCount")}
                        >
                          Play Count
                          {sortColumn === "playCount" &&
                            (sortDirection === "asc" ? " ↑" : " ↓")}
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          onClick={() => handleSort("lastPlayed")}
                        >
                          Last Played
                          {sortColumn === "lastPlayed" &&
                            (sortDirection === "asc" ? " ↑" : " ↓")}
                        </button>
                      </th>

                      <th>
                        <button
                          type="button"
                          onClick={() => handleSort("records")}
                        >
                          Records
                          {sortColumn === "records" &&
                            (sortDirection === "asc" ? " ↑" : " ↓")}
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedGames.map((game) => (
                      <tr key={game.gameId}>
                        <td className="game-name" title={game.gameName}>
                          {game.gameName}
                        </td>
                        <td>{game.gameId}</td>
                        <td>
                          {game.hasMaxPlayCount ? (
                            <span title="One or more records has reached its maximum value.">
                              {game.playCount}+*
                            </span>
                          ) : (
                            game.playCount
                          )}
                        </td>
                        <td>
                          {game.lastPlayed === null ? (
                            <span title="The last record reports a date prior to the PS2's launch, which is likely indicative of a dead clock battery.">
                              Unknown**
                            </span>
                          ) : (
                            game.lastPlayed.toISOString().slice(0, 10)
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedGameId(game.gameId)}
                          >
                            {game.records}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="hide-on-desktop">
                <p>
                  <i>
                    * denotes a game with one or more records that have reached
                    the PS2's maximum play count value of 63. The true number of
                    game launches likely exceeds this number.
                  </i>
                </p>
                <br />
                <p>
                  <i>
                    ** denotes a game with records reporting a date prior to the
                    PS2's launch, which is likely indicative of a dead clock
                    battery.
                  </i>
                </p>
                <br />
              </div>
            </>
          )}
        </>
      )}
      {selectedGameId && (
        <section>
          <br />

          <h2>
            {games.find((game) => game.gameId === selectedGameId)?.gameName}
          </h2>
          <p>
            <i>
              {selectedGameId}{" "}
              <a
                href={games
                  .find((game) => game.gameId === selectedGameId)
                  ?.lookupUrl.toString()}
                target="_blank"
                rel="noopener noreferrer"
              >
                (Redump Lookup)
              </a>
            </i>
          </p>
          <p></p>

          <br />

          <button type="button" onClick={() => setSelectedGameId(null)}>
            <strong>Back to games</strong>
          </button>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Play Count</th>
                <th>Source File</th>
              </tr>
            </thead>

            <tbody>
              {entries
                .filter((entry) => entry.gameId === selectedGameId)
                .map((entry, index) => (
                  <tr key={`${entry.sourceFile}-${index}`}>
                    <td>{entry.date.toISOString().slice(0, 10)}</td>
                    <td>
                      {entry.playCount === 63 ? (
                        <span title="This value caps at 63 on a firmware level. The true number of game launches likely exceeds this number.">
                          {entry.playCount}+*
                        </span>
                      ) : (
                        entry.playCount
                      )}
                    </td>
                    <td>{entry.sourceFile}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="hide-on-desktop">
            <p>
              <i>
                * denotes a record that has reached the PS2's maximum play count
                value of 63. The true number of game launches likely exceeds
                this number.
              </i>
            </p>
          </div>
        </section>
      )}
      {showTutorial && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <p>
              <strong>Obtaining history files</strong>
            </p>

            <br />

            <div className="popup-modal-content">
              <p>
                <strong>
                  The easiest way to obtain the history files is by using
                  uLaunchElf (or its forks), included by default with most
                  custom firmware installs.
                </strong>
              </p>
              <br />
              <p>
                <i>
                  If you already know what you're doing: the files you're
                  looking for are <code>history</code> and{" "}
                  <code>history.old</code> inside <code>BxDATA-SYSTEM</code>.
                </i>
              </p>
              <br />
              <img
                className="tutorial-screenshot"
                src={`${import.meta.env.BASE_URL}tutorial/Step1.webp`}
              />
              <p>
                If you have a FreeMCBoot memory card, you should have a variant
                of uLaunchElf near the top of the PS2 menu. If you don't have
                one,{" "}
                <a
                  href="https://github.com/CTurt/FreeDVDBoot"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  FreeDVDBoot
                </a>{" "}
                is an alternative you may be able to use without purchasing new
                hardware.
              </p>
              <br />
              <p>
                After launching uLaunchELF and pressing Circle to continue{" "}
                <strong>
                  (note that the program uses the Japanese standard for menu
                  controls - Circle to confirm and Cross to cancel)
                </strong>
                , you should see a list of devices. <code>mc0:/</code> and{" "}
                <code>mc1:/</code> are your inserted memory cards, Slot 1 and
                Slot 2 respectively. If you have used both cards
                interchangeably, you may use the history files from both - this
                app supports importing any number of files.
              </p>
              <br />
              <p>
                <strong>
                  Note that PlayStation 1 memory cards do not store history
                  files.
                </strong>
              </p>
              <img
                className="tutorial-screenshot"
                src={`${import.meta.env.BASE_URL}tutorial/Step2.webp`}
              />
              <p>
                After entering one of your memory cards with Circle, you'll see
                a list of save folders. The one you're looking for depends on
                your console's region.
              </p>
              <br />
              <p>
                <li>
                  Asia and the Americas: <code>BADATA-SYSTEM</code>
                </li>
                <li>
                  Europe: <code>BEDATA-SYSTEM</code>
                </li>
                <li>
                  Japan: <code>BIDATA-SYSTEM</code>
                </li>
                <li>
                  China: <code>BCDATA-SYSTEM</code> (untested, format may
                  differ)
                </li>
              </p>
              <img
                className="tutorial-screenshot"
                src={`${import.meta.env.BASE_URL}tutorial/Step3.webp`}
              />
              <br />
              <p>After locating the folder, press Circle to enter it.</p>
              <br />
              <p>
                <strong>
                  If you've ever used MechaPwn or otherwise modified your
                  console's region, you may have multiple folders. You may
                  import all of them at once with the tool, provided that you've
                  given them unique filenames.
                </strong>
              </p>
              <br />
              <p>
                Once in the folder, press Cross to select both{" "}
                <code>history</code> and <code>history.old</code>. With both
                files selected, press R1 to open the menu, then press Circle to
                select the Copy option.
              </p>
              <img
                className="tutorial-screenshot"
                src={`${import.meta.env.BASE_URL}tutorial/Step5.webp`}
              />
              <p>
                With both files copied, repeatedly press Triangle to go back
                until you're at the drive list again. This time, connect a USB
                storage device and navigate to <code>mass:/</code> instead.
              </p>
              <img
                className="tutorial-screenshot"
                src={`${import.meta.env.BASE_URL}tutorial/Step6.webp`}
              />
              <p>
                The contents of your USB device will now be displayed. Pick
                whichever directory you'd like to place the files in, press R1
                to open the menu again, and this time select Paste.
              </p>
              <img
                className="tutorial-screenshot"
                src={`${import.meta.env.BASE_URL}tutorial/Step7.webp`}
              />
              <p>
                The files will now be stored on your USB device. Power down your
                console, insert it into your computer, and upload the files on
                the previous page.
              </p>
              <br />
              <p>
                <strong>
                  All processing is handled locally in the browser, your
                  imported files stay private and are not uploaded to the
                  internet.
                </strong>
              </p>
            </div>

            <br />
            <div>
              <button type="button" onClick={() => setShowTutorial(false)}>
                <strong>Close</strong>
              </button>
            </div>
          </div>
        </div>
      )}
      {showCredits && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <p>
              <strong>Credits</strong>
            </p>

            <br />

            <div className="popup-modal-content">
              <p>
                <strong>
                  Developed by{" "}
                  <a
                    href="https://github.com/ambermemorydoll"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Amber L.
                  </a>
                </strong>
              </p>
              <br />
              <p>Special thanks to:</p>
              <br />
              <li>
                <p>
                  <a
                    href="https://www.youtube.com/@sync-on-luma"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    sync-on-luma (y)
                  </a>{" "}
                  for his excellent{" "}
                  <a
                    href="https://www.youtube.com/watch?v=hjekB5x8uXo"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    video on reverse-engineering the history files
                  </a>{" "}
                  of the PS2.
                </p>
              </li>
              <li>
                <p>
                  <a
                    href="https://github.com/israpps"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    israpps
                  </a>{" "}
                  for his{" "}
                  <a
                    href="https://israpps.github.io/FreeMcBoot-Installer/test/10_System_Updates.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    research on the PS2's system folders
                  </a>{" "}
                  and his{" "}
                  <a
                    href="https://github.com/israpps/PS2-HistoryTweaker"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PS2-HistoryTweaker project
                  </a>
                  .
                </p>
              </li>
              <li>
                <p>
                  The{" "}
                  <a
                    href="https://github.com/niemasd/GameDB-PSX"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GameDB-PSX Database
                  </a>{" "}
                  for the PSX.data.tsv file used to match PS1 game IDs with
                  titles.
                </p>
              </li>
              <li>
                <p>
                  The{" "}
                  <a
                    href="https://github.com/VTSTech/PS2-OPL-CFG"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PS2-OPL-CFG Database
                  </a>{" "}
                  for the PS2-GAMEID-TITLE-MASTER.csv file used to match PS2
                  game IDs with titles.
                </p>
              </li>
              <br />
              <p>
                This project is not affiliated with Sony Computer Entertainment
                or the PlayStation brand in any capacity.
              </p>
            </div>

            <br />

            <div>
              <button type="button" onClick={() => setShowCredits(false)}>
                <strong>Close</strong>
              </button>
            </div>
          </div>
        </div>
      )}
      {showShare && (
        <div className="popup-overlay">
          <div className="popup-modal tabbed-modal">
            <p>
              <strong>Share</strong>
            </p>

            <br />

            <div className="button-row share-tab-row">
              <button type="button" onClick={() => setShareTab(0)}>
                {shareTab === 0 ? <strong>● Image</strong> : "Image"}
              </button>
              <button type="button" onClick={() => setShareTab(1)}>
                {shareTab === 1 ? <strong>● Text</strong> : "Text"}
              </button>
            </div>

            <div className="popup-modal-content">
              {shareTab === 0 ? (
                <div className="image-share-box">
                  {shareImageUrl ? (
                    <div>
                      <img
                        className="share-image-preview"
                        src={shareImageUrl}
                      />
                      <div className="button-row share-buttons">
                        <button type="button" onClick={downloadShareImage}>
                          <strong>Download Image</strong>
                        </button>
                        {shareImagePossible && (
                          <button type="button" onClick={openImageShareDialog}>
                            <strong>Share Image</strong>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <br />
                      <p>
                        <strong>Generating image...</strong>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="share-text-preview">{handleShareDisplay()}</p>
                  {shareText && (
                    <div className="button-row share-buttons">
                      <button type="button" onClick={handleShareTextCopy}>
                        <strong>
                          {recentlyCopied ? "Copied!" : "Copy to Clipboard"}
                        </strong>
                      </button>
                      {shareTextPossible ? (
                        <button type="button" onClick={handleShareTextDialog}>
                          <strong>Share Text</strong>
                        </button>
                      ) : (
                        <button type="button" onClick={handleShareTextTwitter}>
                          <strong>Share to X</strong>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <br />

            <div>
              <button type="button" onClick={() => setShowShare(false)}>
                <strong>Close</strong>
              </button>
            </div>
          </div>
        </div>
      )}
      <br />
      <br />
      <div>
        <div className="button-row footer-buttons">
          <button type="button" onClick={() => setShowCredits(true)}>
            <strong>Credits</strong>
          </button>
          <button
            type="button"
            onClick={() => {
              window.open(
                "https://github.com/ambermemorydoll/ps2-play-history",
              );
            }}
          >
            <strong>GitHub</strong>
          </button>
        </div>
      </div>
      <br />
    </main>
  );
}

export default App;
