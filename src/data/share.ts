import type { GameSummary } from "./statistics";
import type { OverallSummary } from "./statistics";

const APP_URL = "https://ambermemorydoll.github.io/ps2-play-history/";

export function createShareSummary(
  overallSummary: OverallSummary,
  topGames: GameSummary[],
): string {
  return `My ${generateTimespanTextShort(overallSummary.timespan.years, overallSummary.timespan.months, overallSummary.timespan.days)} of PS2 play history:
${overallSummary.uniqueGames} games played
${overallSummary.sessions} sessions${overallSummary.earliestRecord ? "\nsince " + overallSummary.earliestRecord.toLocaleDateString() : ""}

My top games:
${topGames[0] ? "🥇 " + topGames[0].gameName + "" : ""}${topGames[1] ? "\n🥈 " + topGames[1].gameName + "" : ""}${topGames[2] ? "\n🥉 " + topGames[2].gameName : ""}`;
}

export async function generateShareImage(
  overallSummary: OverallSummary,
  topGames: GameSummary[],
): Promise<Blob | null> {
  const width = 1024;
  const height = 1024;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  // Basic gradient background
  /*const bgGradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  bgGradient.addColorStop(0, "#15101D");
  bgGradient.addColorStop(1, "#173064");*/

  // Image background
  await drawImageFromFile(ctx, "share-bg.png", 0, 0, width, height);

  // Main heading
  drawOutlinedText(
    ctx,
    "My PS2 Play History",
    "bold 48px system-ui",
    "center",
    "middle",
    "#d6d601",
    "black",
    12,
    width / 2,
    100,
  );

  // Usage timespan
  drawOutlinedText(
    ctx,
    generateTimespanTextLong(
      overallSummary.timespan.years,
      overallSummary.timespan.months,
      overallSummary.timespan.days,
    ),
    "bold 48px system-ui",
    "center",
    "middle",
    "#d6d601",
    "black",
    12,
    width / 2,
    200,
  );

  // Start date
  drawOutlinedText(
    ctx,
    `${overallSummary.earliestRecord ? "starting " + overallSummary.earliestRecord.toLocaleDateString() : ""}`,
    "bold 48px system-ui",
    "center",
    "middle",
    "#bbbbbc",
    "black",
    12,
    width / 2,
    275,
  );

  // Games played
  drawOutlinedText(
    ctx,
    `Games played: ${overallSummary.uniqueGames}`,
    "bold 48px system-ui",
    "center",
    "middle",
    "#39d1fa",
    "black",
    12,
    width / 2,
    375,
  );

  // Sessions
  drawOutlinedText(
    ctx,
    `Sessions: ${overallSummary.sessions}`,
    "bold 48px system-ui",
    "center",
    "middle",
    "#39d1fa",
    "black",
    12,
    width / 2,
    450,
  );

  if (topGames[0]) {
    // Top games heading
    drawOutlinedText(
      ctx,
      "Top games:",
      "bold 48px system-ui",
      "left",
      "middle",
      "#d6d601",
      "black",
      12,
      50,
      550,
    );

    // Title of top game #1
    drawOutlinedText(
      ctx,
      `1. ${truncateTextByWidth(ctx, topGames[0].gameName, 730)}`,
      "bold 48px system-ui",
      "left",
      "middle",
      "#39d1fa",
      "black",
      12,
      50,
      625,
    );
  }
  if (topGames[1]) {
    // Title of top game #2
    drawOutlinedText(
      ctx,
      `2. ${truncateTextByWidth(ctx, topGames[1].gameName, 730)}`,
      "bold 48px system-ui",
      "left",
      "middle",
      "#39d1fa",
      "black",
      12,
      50,
      700,
    );
  }
  if (topGames[2]) {
    // Title of top game #3
    drawOutlinedText(
      ctx,
      `3. ${truncateTextByWidth(ctx, topGames[2].gameName, 730)}`,
      "bold 48px system-ui",
      "left",
      "middle",
      "#39d1fa",
      "black",
      12,
      50,
      775,
    );
  }

  ctx.textAlign = "right";

  if (topGames[0]) {
    // Plays heading
    drawOutlinedText(
      ctx,
      "Plays",
      "bold 48px system-ui",
      "right",
      "middle",
      "#d6d601",
      "black",
      12,
      width - 50,
      550,
    );

    // Play count for top game #1
    drawOutlinedText(
      ctx,
      `${topGames[0].playCount}`,
      "bold 48px system-ui",
      "right",
      "middle",
      "#bbbbbc",
      "black",
      12,
      width - 50,
      625,
    );
  }
  if (topGames[1]) {
    // Play count for top game #2
    drawOutlinedText(
      ctx,
      `${topGames[1].playCount}`,
      "bold 48px system-ui",
      "right",
      "middle",
      "#bbbbbc",
      "black",
      12,
      width - 50,
      700,
    );
  }
  if (topGames[2]) {
    // Play count for top game #3
    drawOutlinedText(
      ctx,
      `${topGames[2].playCount}`,
      "bold 48px system-ui",
      "right",
      "middle",
      "#bbbbbc",
      "black",
      12,
      width - 50,
      775,
    );
  }

  drawOutlinedText(
    ctx,
    `Made with: ${APP_URL}`,
    "28px system-ui",
    "left",
    "bottom",
    "#bbbbbc",
    "black",
    12,
    10,
    height - 10,
  );

  // QR code embed
  await drawImageFromFile(
    ctx,
    "page-qr-code.png",
    width - 150 - 10,
    height - 150 - 10,
    150,
    150,
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

// Returns e.g. "22 years" and discards everything in lower units
function generateTimespanTextShort(
  years: number,
  months: number,
  days: number,
): string {
  let timespan = "";
  if (years > 0) {
    timespan = `${years} ${pluraliseNumberLabel(years, "year")}`;
  } else if (months > 0) {
    timespan = `${months} ${pluraliseNumberLabel(months, "month")}`;
  } else {
    timespan = `${days} ${pluraliseNumberLabel(days, "day")}`;
  }

  return timespan;
}

// Returns e.g. "22 years, 1 months, 15 days"
function generateTimespanTextLong(
  years: number,
  months: number,
  days: number,
): string {
  let timespan = `${years > 0 ? years + ` ${pluraliseNumberLabel(years, "year")}, ` : ""}${years > 0 || months > 0 ? months + ` ${pluraliseNumberLabel(months, "month")}, ` : ""}${days} ${pluraliseNumberLabel(days, "day")}`;
  return timespan;
}

// Makes e.g. "month" into "months" if the number of months isn't 1.
// Refactored into its own function because it's called three times in
// one line above, and all the nested brackets were hard to parse.
function pluraliseNumberLabel(number: number, label: string): string {
  return number === 1 ? label : label + "s";
}

// Mythical StackOverflow pull. Decides how much text to allow based on
// max width in pixels.
function truncateTextByWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  var width = ctx.measureText(text).width;
  var ellipsis = "…";
  var ellipsisWidth = ctx.measureText(ellipsis).width;
  if (width <= maxWidth || width <= ellipsisWidth) {
    return text;
  } else {
    var len = text.length;
    while (width >= maxWidth - ellipsisWidth && len-- > 0) {
      text = text.substring(0, len);
      width = ctx.measureText(text).width;
    }
    return text + ellipsis;
  }
}

async function drawImageFromFile(
  ctx: CanvasRenderingContext2D,
  imageUrl: string,
  startX: number,
  startY: number,
  width: number,
  height: number,
) {
  const image = new Image();
  image.src = `${import.meta.env.BASE_URL}${imageUrl}`;
  await image.decode();
  ctx.drawImage(image, startX, startY, width, height);
}

function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  textAlign: CanvasTextAlign,
  textBaseline: CanvasTextBaseline,
  textColor: string,
  outlineColor: string,
  outlineThickness: number,
  X: number,
  Y: number,
) {
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.font = font;
  ctx.strokeStyle = outlineColor;
  ctx.fillStyle = textColor;
  ctx.lineWidth = outlineThickness;
  ctx.lineJoin = "round";

  ctx.strokeText(text, X, Y);
  ctx.fillText(text, X, Y);
}
