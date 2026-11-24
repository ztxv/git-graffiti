const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createServer } = require("../src/server");

// The local server serves dist/. Use throwaway fixtures there (dist/ is
// gitignored) so this test needs neither a build nor any real asset.
test("static files are served with proper content types", async () => {
  const dist = path.join(__dirname, "../dist");
  const existed = await fs.stat(dist).then(() => true, () => false);
  await fs.mkdir(dist, { recursive: true });
  const expected = {
    "__static-test.png": "image/png",
    "__static-test.ico": "image/vnd.microsoft.icon",
    "__static-test.svg": "image/svg+xml",
    "__static-test.jpg": "image/jpeg",
    "__static-test.webp": "image/webp",
    "__static-test.json": "application/json",
    "__static-test.woff2": "font/woff2",
    "__static-test.unknown": "application/octet-stream"
  };
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const name of Object.keys(expected))
      await fs.writeFile(path.join(dist, name), "x");
    for (const [name, type] of Object.entries(expected)) {
      const response = await fetch(`${base}/${name}`);
      assert.equal(response.status, 200, name);
      assert.equal(response.headers.get("content-type"), type, name);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const name of Object.keys(expected))
      await fs.rm(path.join(dist, name), { force: true });
    if (!existed) await fs.rm(dist, { recursive: true, force: true });
  }
});
