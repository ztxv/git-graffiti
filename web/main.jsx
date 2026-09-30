import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Pencil,
  Eraser,
  RefreshCw,
  Undo2,
  Redo2,
  Download,
  Upload,
  Trash2,
  GitBranch,
  MousePointer2,
  Check,
  Terminal,
  X
} from "lucide-react";
import {
  calendar,
  rasterize,
  validateDesign,
  DEFAULT_MAPPING,
  dateKey
} from "../shared/art.mjs";
import { PublishInstructions } from "./components/publish-instructions";
import "./style.css";
const today = dateKey(Date.now()),
  thisYear = new Date().getUTCFullYear();
const storageKey = "git-graffiti-v1";
function initialDesign() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return validateDesign(JSON.parse(saved));
  } catch {}
  const year = thisYear - 1,
    cells = calendar(year);
  return {
    version: 1,
    year,
    pixels: rasterize("HELLO", cells.length / 7),
    mapping: DEFAULT_MAPPING
  };
}
async function api(route, body) {
  const r = await fetch(
    route,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
  );
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "The local server is unavailable. Start the app with npm start."
    );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function Mini({ text }) {
  const p = rasterize(text, 35);
  return (
    <div className="mini" aria-hidden="true">
      {p.map((n, i) => (
        <i key={i} className={n ? "lit" : ""} />
      ))}
    </div>
  );
}
function App() {
  const [design, setDesign] = useState(initialDesign),
    [past, setPast] = useState([]),
    [future, setFuture] = useState([]);
  const [tool, setTool] = useState("paint"),
    [shade, setShade] = useState(4),
    [text, setText] = useState("HELLO"),
    [align, setAlign] = useState("center");
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [hover, setHover] = useState(null),
    [focus, setFocus] = useState(7);
  const [identity, setIdentity] = useState({
      name: "",
      email: "",
      folder: "my-graffiti"
    }),
    [config, setConfig] = useState(null),
    [job, setJob] = useState(null),
    [submitting, setSubmitting] = useState(false),
    [cancelPending, setCancelPending] = useState(false);
  const [saved, setSaved] = useState(true);
  const designRef = useRef(design),
    stroke = useRef(null),
    importer = useRef(null),
    board = useRef(null);
  designRef.current = design;
  const cells = calendar(design.year),
    weeks = cells.length / 7,
    busy = submitting || job?.status === "running";
  let designError = "";
  try {
    validateDesign(design);
  } catch (e) {
    designError = e.message;
  }
  const focusIndex =
    cells[focus] && cells[focus] <= today
      ? focus
      : cells.findIndex(d => d && d <= today);
  const total = design.pixels.reduce(
      (sum, n) => sum + (design.mapping[n] || 0),
      0
    ),
    active = design.pixels.filter(Boolean).length;
  useEffect(() => {
    api("/api/config")
      .then(setConfig)
      .catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(validateDesign(design)));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [design]);
  useEffect(() => {
    const end = () => {
      stroke.current = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("blur", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", end);
    };
  }, []);
  useEffect(() => {
    if (job?.status !== "running") return;
    let stopped = false,
      timer;
    const poll = async () => {
      try {
        const next = await api(`/api/jobs/${job.id}`);
        if (!stopped) {
          setJob(next);
          setError("");
        }
      } catch (e) {
        if (!stopped) setError(`Progress unavailable: ${e.message} Retrying…`);
      }
      if (!stopped) timer = setTimeout(poll, 650);
    };
    timer = setTimeout(poll, 650);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [job?.id, job?.status]);
  function change(next, label = "") {
    if (busy) return;
    setPast(p => [...p.slice(-59), designRef.current]);
    setFuture([]);
    setDesign(next);
    setError("");
    setMessage(label);
  }
  function undo() {
    if (!past.length || busy) return;
    setFuture(f => [design, ...f]);
    setDesign(past.at(-1));
    setPast(p => p.slice(0, -1));
    setMessage("Change undone.");
  }
  function redo() {
    if (!future.length || busy) return;
    setPast(p => [...p, design]);
    setDesign(future[0]);
    setFuture(f => f.slice(1));
    setMessage("Change restored.");
  }
  function editable(i) {
    return cells[i] && cells[i] <= today;
  }
  function paint(i, start = false) {
    if (busy || !editable(i)) return;
    if (start) {
      stroke.current = { visited: new Set() };
      setPast(p => [...p.slice(-59), designRef.current]);
      setFuture([]);
    }
    if (!stroke.current || stroke.current.visited.has(i)) return;
    stroke.current.visited.add(i);
    setDesign(d => ({
      ...d,
      pixels: d.pixels.map((n, j) =>
        j === i
          ? tool === "erase"
            ? 0
            : tool === "cycle"
            ? (n + 1) % 5
            : shade
          : n
      )
    }));
    setError("");
    setMessage("");
  }
  function stamp(value = text) {
    try {
      const width = Array.from(value).length * 6 - 1,
        offset =
          align === "left"
            ? 1
            : align === "right"
            ? weeks - width - 1
            : undefined;
      const pixels = rasterize(value, weeks, { level: shade || 4, offset });
      const next = validateDesign({ ...design, pixels });
      change(
        next,
        `Stamped “${value.toUpperCase()}”. Undo to recover your previous artwork.`
      );
    } catch (e) {
      setError(e.message);
    }
  }
  function exportDesign() {
    try {
      const data = validateDesign(design);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `git-graffiti-${design.year}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Design exported.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function importDesign(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 20000)
        throw new Error("Choose a design file smaller than 20 KB.");
      change(validateDesign(JSON.parse(await file.text())), "Design imported.");
    } catch (e) {
      setError(`Could not import: ${e.message}`);
    }
  }
  async function generate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setCancelPending(false);
    try {
      const p = await api("/api/art/preview", validateDesign(design));
      setJob(await api("/api/generate", { previewId: p.id, ...identity }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }
  async function cancel() {
    setCancelPending(true);
    try {
      await api("/api/cancel", { id: job.id });
    } catch (e) {
      setError(e.message);
      setCancelPending(false);
    }
  }
  function navigate(e, i) {
    const jump = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[
      e.key
    ];
    if (jump) {
      e.preventDefault();
      let next = i + jump;
      while (next >= 0 && next < cells.length && !editable(next)) next += jump;
      if (next >= 0 && next < cells.length) {
        setFocus(next);
        board.current.querySelector(`[data-index="${next}"]`)?.focus();
      }
    }
  }
  let lastMonth = -1;
  const months = cells.flatMap((d, i) => {
    if (!d) return [];
    const m = Number(d.slice(5, 7));
    if (m === lastMonth) return [];
    lastMonth = m;
    return [
      {
        label: new Date(d + "T12:00:00Z").toLocaleString("en", {
          month: "short",
          timeZone: "UTC"
        }),
        col: Math.floor(i / 7)
      }
    ];
  });
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Git Graffiti home">
          <span className="brandmark">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          git<span>graffiti</span>
          <sup>STUDIO</sup>
        </a>
        <div className="top-right">
          <span className="status-dot" /> Local workspace{" "}
          <span className="top-divider" />{" "}
          <a href="#how-it-works">
            How it works <ArrowUpRight size={14} />
          </a>
        </div>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">
              <span /> YOUR PROFILE. YOUR CANVAS.
            </div>
            <h1>
              Leave your <em>mark.</em>
            </h1>
            <p>
              Turn your contribution graph into a little piece of you.
              <br />
              Write a message. Draw something weird. Make it yours.
            </p>
          </div>
          <div className="hero-stamp">
            <span>SMALL PIXELS.</span>
            <strong>BIG PERSONALITY.</strong>
            <span>7 ROWS × ENDLESS POSSIBILITIES ↗</span>
          </div>
        </section>
        <div className="section-heading">
          <div>
            <span className="step">01</span>
            <h2>The canvas</h2>
            <span className="small muted">One square. One day.</span>
          </div>
          <div className="file-actions">
            <button onClick={() => importer.current.click()} disabled={busy}>
              <Upload size={15} /> Import
            </button>
            <button onClick={exportDesign}>
              <Download size={15} /> Export design
            </button>
            <input
              ref={importer}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={importDesign}
            />
          </div>
        </div>
        <section className="canvas-card" aria-label="Contribution art editor">
          <div className="canvas-toolbar">
            <div className="tools" role="group" aria-label="Drawing tool">
              {[
                ["paint", Pencil, "Paint"],
                ["erase", Eraser, "Erase"],
                ["cycle", RefreshCw, "Cycle"]
              ].map(([id, Icon, label]) => (
                <button
                  key={id}
                  className={tool === id ? "selected" : ""}
                  aria-pressed={tool === id}
                  onClick={() => setTool(id)}
                  disabled={busy}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
              <span className="tool-divider" />
              <button
                className="icon-button"
                aria-label="Undo"
                title="Undo"
                onClick={undo}
                disabled={busy || !past.length}
              >
                <Undo2 size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Redo"
                title="Redo"
                onClick={redo}
                disabled={busy || !future.length}
              >
                <Redo2 size={16} />
              </button>
            </div>
            <label className="year-select">
              YEAR{" "}
              <select
                value={design.year}
                disabled={busy}
                onChange={e => {
                  const year = Number(e.target.value),
                    dates = calendar(year);
                  change(
                    {
                      ...design,
                      year,
                      pixels: dates.map((d, i) =>
                        d && d <= today ? design.pixels[i] || 0 : 0
                      )
                    },
                    "Year changed. Pixels on unavailable dates were cleared."
                  );
                }}
              >
                {Array.from(
                  { length: thisYear - 1969 },
                  (_, i) => thisYear - i
                ).map(y => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="canvas-scroll">
            <div className="calendar" style={{ "--weeks": weeks }}>
              <div className="months">
                {months.map(m => (
                  <span key={m.label} style={{ gridColumn: m.col + 1 }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="board-wrap">
                <div className="weekdays">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div
                  className="board"
                  ref={board}
                  aria-label={`${design.year} pixel canvas. Use arrow keys to move and Space to draw.`}
                  onPointerMove={e => {
                    if (!stroke.current) return;
                    const el = document
                      .elementFromPoint(e.clientX, e.clientY)
                      ?.closest("[data-index]");
                    if (el && board.current.contains(el))
                      paint(Number(el.dataset.index));
                  }}
                  onPointerDown={e => {
                    if (
                      e.pointerType === "touch" &&
                      e.target.closest("[data-index]")
                    ) {
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }
                  }}
                >
                  {cells.map((date, i) => (
                    <button
                      key={i}
                      data-index={i}
                      className={`pixel level-${design.pixels[i]} ${
                        !date ? "outside" : date > today ? "future" : ""
                      }`}
                      disabled={!editable(i) || busy}
                      tabIndex={i === focusIndex ? 0 : -1}
                      aria-label={`${date || "Outside year"}: shade ${
                        design.pixels[i]
                      }, ${design.mapping[design.pixels[i]]} commits`}
                      title={
                        date
                          ? `${date} · ${
                              design.mapping[design.pixels[i]]
                            } commits`
                          : undefined
                      }
                      onFocus={() => {
                        setFocus(i);
                        setHover(i);
                      }}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onPointerDown={e => {
                        if (e.button !== 0) return;
                        paint(i, true);
                      }}
                      onClick={e => {
                        if (e.detail === 0) {
                          paint(i, true);
                          stroke.current = null;
                        }
                      }}
                      onKeyDown={e => navigate(e, i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="canvas-caption">
            <span>
              <MousePointer2 size={13} />
              {hover !== null && cells[hover]
                ? `${cells[hover]} · ${
                    design.mapping[design.pixels[hover]]
                  } commits`
                : "Click or drag to draw. Arrow keys + Space work too."}
            </span>
            <span className="legend">
              Less{" "}
              {[0, 1, 2, 3, 4].map(n => (
                <i key={n} className={`level-${n}`} />
              ))}{" "}
              More
            </span>
          </div>
          <div className="canvas-stats">
            <div>
              <strong>{active}</strong>
              <span>painted days</span>
            </div>
            <div>
              <strong>{total.toLocaleString()}</strong>
              <span>planned commits</span>
            </div>
            <div className="canvas-size">
              <strong>{weeks} × 7</strong>
              <span>calendar grid</span>
            </div>
            <button
              className="clear"
              disabled={busy || !active}
              onClick={() =>
                change(
                  { ...design, pixels: Array(cells.length).fill(0) },
                  "Canvas cleared. Undo is available."
                )
              }
            >
              <Trash2 size={14} /> Clear canvas
            </button>
          </div>
        </section>
        <div className="editor-panels">
          <section className="control-panel text-panel">
            <div className="panel-title">
              <span className="tiny-number">A</span>
              <h3>Say it in pixels</h3>
              <span className="tag">5 × 7 FONT</span>
            </div>
            <p>A name, an inside joke, a very small manifesto.</p>
            <form
              onSubmit={e => {
                e.preventDefault();
                stamp();
              }}
            >
              <label htmlFor="text-input" className="sr-only">
                Your message
              </label>
              <div className="text-entry">
                <input
                  id="text-input"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="HELLO WORLD"
                  disabled={busy}
                />
                <button className="dark-button" disabled={busy}>
                  Stamp text <ArrowRight size={15} />
                </button>
              </div>
              <div className="text-options">
                <label>
                  Align{" "}
                  <select
                    value={align}
                    onChange={e => setAlign(e.target.value)}
                    disabled={busy}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <span>
                  {Math.max(0, Array.from(text).length * 6 - 1)} / {weeks}{" "}
                  columns
                </span>
              </div>
            </form>
            <small>Stamping replaces the canvas. You can always undo.</small>
          </section>
          <section className="control-panel">
            <div className="panel-title">
              <span className="tiny-number">B</span>
              <h3>Pick your shade</h3>
            </div>
            <p>A little quiet. Or all the way loud.</p>
            <div className="swatches" role="group" aria-label="Brush shade">
              {[0, 1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  className={`swatch level-${n} ${shade === n ? "chosen" : ""}`}
                  aria-pressed={shade === n}
                  aria-label={`Shade ${n}`}
                  onClick={() => setShade(n)}
                >
                  {shade === n && <Check size={18} />}
                </button>
              ))}
            </div>
            <details>
              <summary>
                Commit counts per shade <span>↗</span>
              </summary>
              <div className="mapping">
                {[1, 2, 3, 4].map(n => (
                  <label key={n}>
                    Shade {n}
                    <input
                      aria-label={`Commits for shade ${n}`}
                      type="number"
                      min="1"
                      max="100"
                      value={design.mapping[n]}
                      disabled={busy}
                      onChange={e =>
                        change({
                          ...design,
                          mapping: design.mapping.map((v, i) =>
                            i === n ? Number(e.target.value) : v
                          )
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
            <small>
              Colors are illustrative. GitHub sets the final shading.
            </small>
          </section>
        </div>
        <div className="presets">
          <div>
            <span className="eyebrow">A LITTLE INSPIRATION</span>
            <p>
              Start somewhere.
              <br />
              <strong>Then make it yours.</strong>
            </p>
          </div>
          {[
            ["♥ ♥ ♥", "Love notes"],
            ["< />", "Made of code"],
            ["HI!", "Say hello"]
          ].map(([value, label]) => (
            <button
              key={label}
              className="preset"
              disabled={busy}
              onClick={() => {
                setText(value);
                stamp(value);
              }}
            >
              <Mini text={value} />
              <span>
                {label}
                <ArrowUpRight size={14} />
              </span>
            </button>
          ))}
        </div>
        <div className="feedback" aria-live="polite">
          {error || designError ? (
            <p role="alert" className="error">
              {error || designError}
            </p>
          ) : (
            <p>
              {message || (
                <>
                  <span className="status-dot" />
                  {saved
                    ? "Draft saved in this browser"
                    : "Browser storage unavailable — export to save your design"}
                </>
              )}
            </p>
          )}
        </div>
        <section className="output-section" id="how-it-works">
          <div className="output-copy">
            <div className="eyebrow">
              <span className="step">02</span> FROM PIXELS TO PROFILE
            </div>
            <h2>
              Take it off
              <br />
              the canvas.
            </h2>
            <p>
              Your artwork becomes a new local repository, with commits placed
              on each painted day. Then you push it to GitHub.
            </p>
            <a
              href="https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference"
              target="_blank"
              rel="noreferrer"
            >
              Read GitHub’s contribution rules <ArrowUpRight size={14} />
            </a>
            <p className="fine-print">
              Use an email linked to your GitHub account and a standalone
              repository’s default branch. Existing activity can fill empty
              pixels and change shades. This preview shows only your design;
              select {design.year} on your profile to see that year.
            </p>
          </div>
          <div className="generation-panel">
            <h3>
              <GitBranch size={18} /> Make it a repository
            </h3>
            <form onSubmit={generate}>
              <fieldset disabled={busy}>
                <div className="identity-row">
                  <label>
                    Author name
                    <input
                      required
                      maxLength={100}
                      value={identity.name}
                      placeholder="Your name"
                      onChange={e =>
                        setIdentity({ ...identity, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    GitHub-linked email
                    <input
                      required
                      type="email"
                      value={identity.email}
                      placeholder="you@example.com"
                      onChange={e =>
                        setIdentity({ ...identity, email: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  New repository folder
                  <input
                    required
                    pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,79}"
                    value={identity.folder}
                    onChange={e =>
                      setIdentity({ ...identity, folder: e.target.value })
                    }
                  />
                </label>
                <div className="generate-footer">
                  <span>
                    <Terminal size={14} /> Created on your machine
                  </span>
                  <button
                    className="green-button"
                    disabled={
                      busy || !total || !!designError || !config?.gitAvailable
                    }
                  >
                    {submitting
                      ? "Preparing…"
                      : job?.status === "running"
                      ? "Generating…"
                      : "Generate repository"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </fieldset>
            </form>
            {config && !config.gitAvailable && (
              <p className="error">
                Install Git before generating a repository.
              </p>
            )}
            {job && (
              <div className="job" aria-live="polite">
                <div className="job-top">
                  <strong>
                    {
                      {
                        running: "Creating your artwork…",
                        complete: "Your repository is ready.",
                        failed: "Generation failed.",
                        cancelled: "Generation cancelled."
                      }[job.status]
                    }
                  </strong>
                  {job.status === "running" && (
                    <button onClick={cancel} disabled={cancelPending}>
                      <X size={14} />
                      {cancelPending ? "Cancelling…" : "Cancel"}
                    </button>
                  )}
                </div>
                <progress value={job.completed} max={job.total} />
                <small>
                  {job.completed.toLocaleString()} /{" "}
                  {job.total.toLocaleString()} commits
                </small>
                {job.error && <p>{job.error}</p>}
                {job.status === "complete" && (
                  <>
                    <code className="output-path">{job.path}</code>
                    <PublishInstructions path={job.path} />
                  </>
                )}
              </div>
            )}
          </div>
        </section>
        <footer>
          <span className="brand footer-brand">
            git<span>graffiti</span>
          </span>
          <span>A little less spreadsheet. A little more self-expression.</span>
          <span>MADE TO MAKE YOUR MARK ↗</span>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
