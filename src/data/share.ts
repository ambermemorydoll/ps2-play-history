import type { GameSummary } from "./statistics";
import type { OverallSummary } from "./statistics";

export function createShareSummary(
  overallSummary: OverallSummary,
  topGames: GameSummary[],
): string {
  let timespan = "";
  if (overallSummary.timespan.years > 0) {
    timespan = `${overallSummary.timespan.years} year${overallSummary.timespan.years === 1 ? "" : "s"}`;
  } else if (overallSummary.timespan.months > 0) {
    timespan = `${overallSummary.timespan.months} month${overallSummary.timespan.months === 1 ? "" : "s"}`;
  } else {
    timespan = `${overallSummary.timespan.days} day${overallSummary.timespan.days === 1 ? "" : "s"}`;
  }

  console.log(topGames);

  return `My ${timespan} of PS2 play history:
${overallSummary.uniqueGames} games played
${overallSummary.sessions} sessions${overallSummary.earliestRecord ? "\nsince " + overallSummary.earliestRecord.toLocaleDateString() : ""}

My top games:
${topGames[0] ? "🥇 " + topGames[0].gameName + "" : ""}${topGames[1] ? "\n🥈 " + topGames[1].gameName + "" : ""}${topGames[2] ? "\n🥉 " + topGames[2].gameName : ""}`;
}
