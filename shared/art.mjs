export const DAY = 86400000;
export const DEFAULT_MAPPING = [0, 1, 3, 6, 10];
export const dateKey = value => new Date(value).toISOString().slice(0, 10);
export function calendar(year) {
  if (!Number.isInteger(year) || year < 1970 || year > 2100)
    throw new Error("Choose a year from 1970 to 2100.");
  const start = Date.UTC(year, 0, 1),
    end = Date.UTC(year, 11, 31);
  const offset = new Date(start).getUTCDay();
  const weeks = Math.ceil((Math.round((end - start) / DAY) + 1 + offset) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = start + (i - offset) * DAY;
    return date < start || date > end ? null : dateKey(date);
  });
}
// Each glyph is five columns by seven rows. Pixels are stored column-major:
// index = week * 7 + weekday, with Sunday at row zero.
const glyphs = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  6: ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": Array(7).fill("00000"),
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "<": ["00001", "00010", "00100", "01000", "00100", "00010", "00001"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
  "♥": ["00000", "01010", "11111", "11111", "01110", "00100", "00000"]
};
export function rasterize(text, weeks, { level = 4, offset } = {}) {
  const chars = Array.from(text.toUpperCase());
  if (!chars.length) throw new Error("Enter something to stamp.");
  if (chars.some(c => !glyphs[c]))
    throw new Error("Use A–Z, 0–9, spaces, ! ? . - < > / or ♥.");
  const width = chars.length * 6 - 1;
  if (width > weeks)
    throw new Error(
      `That text needs ${width} columns; this canvas has ${weeks}. Try a shorter message.`
    );
  const left = offset ?? Math.floor((weeks - width) / 2);
  if (!Number.isInteger(left) || left < 0 || left + width > weeks)
    throw new Error("Move the text left so it fits on the canvas.");
  const pixels = Array(weeks * 7).fill(0);
  chars.forEach((c, n) =>
    glyphs[c].forEach((row, y) =>
      Array.from(row).forEach((bit, x) => {
        if (bit === "1") pixels[(left + n * 6 + x) * 7 + y] = level;
      })
    )
  );
  return pixels;
}
export function validateDesign(input, today = dateKey(Date.now())) {
  if (!input || input.version !== 1)
    throw new Error("This is not a Git Graffiti v1 design.");
  const cells = calendar(input.year);
  if (
    !Array.isArray(input.pixels) ||
    input.pixels.length !== cells.length ||
    !input.pixels.every(n => Number.isInteger(n) && n >= 0 && n <= 4)
  )
    throw new Error(
      "Design pixels must match the calendar and use shades 0–4."
    );
  if (input.pixels.some((n, i) => n && (!cells[i] || cells[i] > today)))
    throw new Error(
      "Artwork cannot include dates outside the year or in the future."
    );
  const m = input.mapping;
  if (
    !Array.isArray(m) ||
    m.length !== 5 ||
    m[0] !== 0 ||
    !m.every(
      (n, i) =>
        Number.isInteger(n) && n >= 0 && n <= 100 && (!i || n > m[i - 1])
    )
  )
    throw new Error(
      "Use increasing whole-number commit counts: 0, then four values from 1 to 100."
    );
  if (input.pixels.reduce((sum, n) => sum + m[n], 0) > 25000)
    throw new Error(
      "This design exceeds the 25,000 commit limit. Lower your shade counts."
    );
  return {
    version: 1,
    year: input.year,
    pixels: [...input.pixels],
    mapping: [...m]
  };
}
export function createArtPlan(input, today) {
  const design = validateDesign(input, today),
    cells = calendar(design.year);
  const days = cells.flatMap((date, i) =>
    date
      ? [
          {
            date,
            count: design.mapping[design.pixels[i]],
            level: design.pixels[i]
          }
        ]
      : []
  );
  const dates = days.flatMap(day =>
    Array.from({ length: day.count }, (_, n) =>
      new Date(Date.parse(day.date + "T12:00:00Z") + n * 1000).toISOString()
    )
  );
  return {
    ...design,
    startDate: `${design.year}-01-01`,
    endDate: `${design.year}-12-31`,
    days,
    dates,
    total: dates.length,
    activeDays: days.filter(d => d.count).length,
    peak: Math.max(...days.map(d => d.count))
  };
}
