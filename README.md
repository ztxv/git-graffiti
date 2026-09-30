# Git Graffiti

A local pixel-art studio for your GitHub contribution graph. Type a message, paint a design, and turn the exact pixels into a standalone Git repository.

## Run it

Requires Node.js 22.12+ and Git.

```sh
npm ci
npm start
```

Open http://127.0.0.1:3000. For another port, run `PORT=4318 npm start`.
This delivered copy already has its dependencies installed. No login is needed to draw or generate.

## Design your graph

1. Choose a year. The default is the last completed year, so the whole canvas is available.
2. Type a message and press **Stamp text**, or draw directly on the grid.
3. Use **Paint** with a chosen shade, **Erase**, or **Cycle** (empty → shades 1–4 → empty). Click or drag; keyboard users can Tab into the canvas, move with arrow keys, and draw with Space or Enter.
4. Undo/redo works across strokes, text stamps, imports, year changes, and clearing. Stamps and presets replace the canvas; undo recovers the previous design.
5. Adjust the four increasing commit counts under **Commit counts per shade**. Defaults are 1, 3, 6, and 10. The preview's shades are illustrative, not a promise of GitHub's final colors.
6. Export a JSON design to save or share it. Import accepts validated v1 design files. A valid draft is also saved automatically in this browser.
7. Enter your author name, GitHub-linked email, and a new folder name. **Generate repository** creates `generated/<folder>`, then displays a copyable publishing command.

The 5×7 font supports A–Z (lowercase is converted), digits, spaces, `! ? . - < > /`, and `♥`. Each character takes five columns, with one separating column. A typical 53-column year fits nine characters only when the painted pixels fit its partial edge weeks. Overflow and unavailable dates are rejected, rather than silently truncating text.

## Calendar and contribution behavior

- Columns are Sunday–Saturday weeks. Most years occupy 53 columns; some leap years need 54. Edge cells outside the selected year cannot be painted.
- Future dates are disabled. Changing years retains week/weekday positions and clears pixels that become unavailable. Undo recovers them.
- The graph represents the selected **calendar year**. On GitHub, select that year to view it; the default rolling contribution view can crop older artwork.
- Existing contributions are not fetched or subtracted. They may fill blank pixels or alter the apparent shades. This app adds commits; it cannot erase other activity.
- Each pixel becomes its configured number of empty commits at noon UTC, one second apart. Both author and committer timestamps match. Empty cells generate no commits. The inherited engine creates a `main` branch without adding an extra initial commit.
- Counts are limited to 100 per painted day and 25,000 per design. Existing destination folders are never overwritten.

GitHub requires the commit email to be associated with your account and eligible commits to be on the repository's default or `gh-pages` branch. Use a new standalone repository, not a fork. See [GitHub's profile contributions reference](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference) for the complete rules. Private contribution visibility is controlled in your GitHub settings. Changes may take time to appear.

## Publishing

Generation is local. The app does not log in or push anything automatically.

After generation, choose Public or Private and copy the displayed command. Run it in Bash, Zsh, or Git Bash with [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`). The command creates a new repository with the generated folder's name and pushes its `main` branch. Choose an unused name; do not pre-create the remote.

The generated repository contains only Git history. An empty working directory is expected.

## Development

```sh
npm run dev   # Vite on 5173 + local API on 3000
npm run build
npm test
```

Architecture:

```text
text / drawing → column-major pixel matrix → UTC dates + shade counts → Git commits
```

- `shared/art.mjs`: font rasterization, calendar coordinates, design validation, deterministic art plans. Used by browser and server.
- `web/main.jsx`, `web/style.css`: editor, autosave, file import/export, generation progress.
- `src/server.js`: loopback-only HTTP service. `POST /api/art/preview` validates and stores an exact design plan; `POST /api/generate` consumes its preview ID.
- `src/repository.js`: inherited Git execution, identity validation, cancellation and cleanup.
- `test/art.test.js`: calendar and font validation plus a real art API → Git integration test.
- `test/history.test.js`: original engine, API, CLI, cancellation and shell-quoting coverage.

The legacy CLI and random-plan endpoint are retained for compatibility. The browser product is centered on pixel art.

The server supports one generation at a time. Cancel removes the newly created partial repository. An abrupt shutdown may leave a partial folder. Jobs live in server memory; browser refresh does not reconnect to a running job, so keep the generation page open until completion or cancellation. Export files contain only the year, pixels, shade mapping and format version, not the author identity. Identity fields are not persisted.

This is a local application, not an authenticated hosted service. GitHub profile rendering has not been verified through an actual push; tests verify local Git output without changing an account.

## Credits and license

Based on the user's Git Larp application and [artiebits/fake-git-history](https://github.com/artiebits/fake-git-history), originally created by Artur Khusaenov. This separate project retains the original MIT license and copyright notice in `LICENSE`.
