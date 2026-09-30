const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createServer } = require("../src/server");
const { git } = require("../src/repository");
const art = import("../shared/art.mjs");
test("calendar preserves weekday coordinates, leap days, and 54-week years", async () => {
  const { calendar } = await art;
  const days = calendar(2024);
  assert.equal(days[0], null);
  assert.equal(days[1], "2024-01-01");
  assert.equal(days.filter(Boolean).length, 366);
  assert.equal(days.indexOf("2024-02-29") % 7, 4);
  assert.equal(calendar(2028).length, 54 * 7);
  for (let y = 1970; y <= 2100; y++)
    calendar(y).forEach((d, i) => {
      if (d) assert.equal(new Date(d + "T12:00:00Z").getUTCDay(), i % 7);
    });
});
test("font rasterization maps rows to weekdays, centers, and rejects overflow or unsupported glyphs", async () => {
  const { rasterize } = await art;
  const p = rasterize("a", 5);
  assert.equal(p.length, 35);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(x => p[x * 7]),
    [0, 4, 4, 4, 0]
  );
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(x => p[x * 7 + 3]),
    [4, 4, 4, 4, 4]
  );
  assert.equal(rasterize("A", 9)[2 * 7 + 1], 4);
  for (const s of ["", "TOO LONG", "😀"]) assert.throws(() => rasterize(s, 5));
  assert.throws(() => rasterize("A", 5, { offset: 1 }));
});
test("design validation rejects malformed grids, unavailable dates, invalid shades, and excessive work", async () => {
  const { calendar, validateDesign, DEFAULT_MAPPING } = await art;
  const input = {
    version: 1,
    year: 2024,
    pixels: calendar(2024).map(() => 0),
    mapping: DEFAULT_MAPPING
  };
  for (const patch of [
    { version: 2 },
    { year: "2024" },
    { pixels: [0] },
    { mapping: [0, 1, 1, 3, 4] },
    { mapping: [0, 1, 2, 3, 101] }
  ])
    assert.throws(() => validateDesign({ ...input, ...patch }));
  for (const [i, n] of [
    [0, 1],
    [1, -1],
    [1, 5],
    [1, 1.2]
  ]) {
    const pixels = [...input.pixels];
    pixels[i] = n;
    assert.throws(() => validateDesign({ ...input, pixels }));
  }
  const future = [...input.pixels];
  future[2] = 4;
  assert.throws(
    () => validateDesign({ ...input, pixels: future }, "2024-01-01"),
    /future/
  );
  assert.throws(
    () =>
      validateDesign({
        ...input,
        mapping: [0, 1, 2, 3, 100],
        pixels: calendar(2024).map(d => (d ? 4 : 0))
      }),
    /25,000/
  );
});
test("art API generates exact per-pixel author and committer dates, leaving blank days empty", async t => {
  const { calendar, DEFAULT_MAPPING, createArtPlan } = await art;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "graffiti-test-"));
  const server = createServer({ root });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  t.after(async () => {
    await new Promise(r => server.close(r));
    await fs.rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body) =>
    fetch(base + route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  const cells = calendar(2024),
    pixels = cells.map(d =>
      d === "2024-02-29" ? 2 : d === "2024-03-03" ? 1 : 0
    );
  const input = { version: 1, year: 2024, pixels, mapping: DEFAULT_MAPPING };
  const preview = await (await post("/api/art/preview", input)).json();
  assert.equal(preview.total, 4);
  assert.equal(preview.dates, undefined);
  const invalid = await post("/api/art/preview", { ...input, pixels: [1] });
  assert.equal(invalid.status, 400);
  let job = await (
    await post("/api/generate", {
      previewId: preview.id,
      name: "Pixel Test",
      email: "pixels@example.com",
      folder: "art"
    })
  ).json();
  for (let i = 0; i < 150 && job.status === "running"; i++) {
    await new Promise(r => setTimeout(r, 50));
    job = await (await fetch(base + "/api/jobs/" + job.id)).json();
  }
  assert.equal(job.status, "complete");
  assert.equal(job.completed, 4);
  const rows = (
    await git(["log", "--reverse", "--format=%aI|%cI"], job.path)
  ).stdout
    .trim()
    .split("\n");
  assert.deepEqual(
    rows.map(r => new Date(r.split("|")[0]).toISOString()),
    createArtPlan(input).dates
  );
  assert.ok(rows.every(r => r.split("|")[0] === r.split("|")[1]));
});
