import { useState } from "react";
import { createGameSummaries, type GameSummary } from "./data/statistics";
import { loadGameDatabase } from "./parser/database";
import { parseHistory, type PlayHistoryEntry } from "./parser/history";
import "./App.css";

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

  async function loadHistoryFiles(files: File[]) {
    setError(null);

    if (files.length === 0) {
      return;
    }

    // Attempt all operations on uploaded files - if any fail, assume
    // unsupported file
    try {
      const allEntries: PlayHistoryEntry[] = [];

      const gameDatabase = await loadGameDatabase();

      for (const file of files) {
        const buffer = await file.arrayBuffer();

        const parsed = parseHistory(buffer, file.name, gameDatabase);

        allEntries.push(...parsed);
      }

      setEntries(allEntries);
      setGames(createGameSummaries(allEntries));
    } catch (err) {
      console.error(err);
      setError("Unsupported file. Please try again.");
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
            throw new Error(`Failed to load ${fileName}`);
          }

          const blob = await response.blob();

          return new File([blob], fileName);
        }),
      );

      setIsSampleData(true);
      await loadHistoryFiles(files);
    } catch (err) {
      console.error(err);
      setError("Failed to load sample data");
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
      <h1>PS2 Play History Viewer</h1>

      <div>
        <p>
          Import any number of <code>history</code> or <code>history.old</code>{" "}
          files to begin.
        </p>

        <div>
          <input type="file" multiple onChange={handleFiles} />
        </div>

        {error && <p>{error}</p>}

        <br />

        <button type="button" onClick={() => setShowTutorial(true)}>
          How to obtain history file?
        </button>
      </div>

      <br />

      {entries.length === 0 && (
        <button type="button" onClick={handleSampleData}>
          Try with sample data
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
              3-4 different owners!
            </p>
          )}
          <div>
            <label htmlFor="game-search">Search games:</label>

            <input
              id="game-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Game name or ID"
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
                          {game.playCount}
                          {game.hasMaxPlayCount && (
                            <span title="One or more records has reached its maximum value.">
                              *
                            </span>
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
              <p>
                <i>
                  * denotes a game with one or more records that have reached
                  the PS2's maximum play count value of 63. The true number of
                  game launches may exceed this number.
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
            <i>{selectedGameId}</i>
          </p>

          <br />

          <button type="button" onClick={() => setSelectedGameId(null)}>
            Back to games
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
                      {entry.playCount}
                      {entry.playCount === 63 && (
                        <span
                          className="play-count-warning"
                          title="This value caps at 63 on a firmware level. The true number of game launches may exceed this number."
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td>{entry.sourceFile}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-modal">
            <p>
              <strong>Obtaining history files</strong>
            </p>

            <br />

            <p>
              <strong>
                The easiest way to obtain the history files is by using
                uLaunchElf (or its forks), included by default with most custom
                firmware installs.
              </strong>
            </p>

            <br />

            <img
              className="tutorial-screenshot"
              src={`${import.meta.env.BASE_URL}tutorial/Step1.jpeg`}
            />

            <p>
              If you have a FreeMCBoot memory card, you should have a variant of
              uLaunchElf near the top of the PS2 menu. If you don't have one,{" "}
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
              <code>mc1:/</code> are your inserted memory cards, Slot 1 and Slot
              2 respectively. If you have used both cards interchangeably, you
              may use the history files from both - this app supports importing
              any number of files.
            </p>

            <br />

            <p>
              <strong>
                Note that PlayStation 1 memory cards do not store history files.
              </strong>
            </p>

            <img
              className="tutorial-screenshot"
              src={`${import.meta.env.BASE_URL}tutorial/Step2.jpeg`}
            />

            <p>
              After entering one of your memory cards with Circle, you'll see a
              list of save folders. The one you're looking for depends on your
              console's region.
            </p>
            <br />
            <p>
              <li>Asia and the Americas: BADATA-SYSTEM</li>
              <li>Europe: BEDATA-SYSTEM</li>
              <li>Japan: BIDATA-SYSTEM</li>
              <li>China: BCDATA-SYSTEM (untested, format may differ)</li>
            </p>

            <img
              className="tutorial-screenshot"
              src={`${import.meta.env.BASE_URL}tutorial/Step3.jpeg`}
            />

            <br />

            <p>After locating the folder, press Circle to enter it.</p>

            <br />

            <p>
              <strong>
                If you've ever used MechaPwn or otherwise modified your
                console's region, you may have multiple folders. You may import
                all of them at once with the tool, provided that you've given
                them unique filenames.
              </strong>
            </p>

            <br />

            <p>
              Once in the folder, press Cross to select both{" "}
              <code>history</code> and <code>history.old</code>. With both files
              selected, press R1 to open the menu, then press Circle to select
              the Copy option.
            </p>

            <img
              className="tutorial-screenshot"
              src={`${import.meta.env.BASE_URL}tutorial/Step5.jpeg`}
            />

            <p>
              With both files copied, repeatedly press Triangle to go back until
              you're at the drive list again. This time, connect a USB storage
              device and navigate to <code>mass:/</code> instead.
            </p>

            <img
              className="tutorial-screenshot"
              src={`${import.meta.env.BASE_URL}tutorial/Step6.jpeg`}
            />

            <p>
              The contents of your USB device will now be displayed. Pick
              whichever directory you'd like to place the files in, press R1 to
              open the menu again, and this time select Paste.
            </p>

            <img
              className="tutorial-screenshot"
              src={`${import.meta.env.BASE_URL}tutorial/Step7.jpeg`}
            />

            <p>
              The files will now be stored on your USB device. Power down your
              console, insert it into your computer, and upload the files on the
              previous page.
            </p>

            <br />

            <p>
              <strong>
                All processing is handled locally in the browser, your imported
                files stay private and are not uploaded to the internet.
              </strong>
            </p>

            <br />

            <button type="button" onClick={() => setShowTutorial(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showCredits && (
        <div className="tutorial-overlay">
          <div className="tutorial-modal">
            <p>
              <strong>Credits</strong>
            </p>

            <br />

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
                for the PS2-GAMEID-TITLE-MASTER.csv file used to match PS2 game
                IDs with titles.
              </p>
            </li>
            <br />
            <p>
              This project is not affiliated with Sony Computer Entertainment or
              the PlayStation brand in any capacity.
            </p>
            <br />

            <button type="button" onClick={() => setShowCredits(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <br />
      <br />

      <div>
        <div className="footer-buttons">
          <button type="button" onClick={() => setShowCredits(true)}>
            Credits
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "https://github.com/ambermemorydoll/ps2-play-history";
            }}
          >
            GitHub
          </button>
        </div>
      </div>

      <br />
    </main>
  );
}

export default App;
