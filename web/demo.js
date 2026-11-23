// Demo mode: a browser-only stand-in for the local Git Graffiti server.
//
// The real app needs a Node server to create Git repositories on disk, which a
// static host (like Vercel) can't do. In demo mode the UI is byte-for-byte the
// same app, but every /api call is answered here and nothing is ever written
// anywhere. Enabled with `npm run build:demo` (VITE_DEMO=true).
import { createArtPlan } from "../shared/art.mjs";

export const DEMO_OUTPUT_ROOT = "~/git-graffiti/generated";

const plans = new Map();
const jobs = new Map();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const id = () => Math.random().toString(36).slice(2, 10);

// Progress is derived from elapsed time so polling stays stateless and cheap.
function snapshot(job) {
  if (job.status === "running") {
    const elapsed = Date.now() - job.startedAt;
    if (elapsed >= job.duration) {
      job.status = "complete";
      job.completed = job.total;
      job.path = `${DEMO_OUTPUT_ROOT}/${job.folder}`;
    } else {
      // Ease-out so the bar feels like real, front-loaded work.
      const t = elapsed / job.duration;
      job.completed = Math.floor(job.total * (1 - (1 - t) * (1 - t)));
    }
  }
  const { startedAt, duration, folder, ...visible } = job;
  return visible;
}

export async function demoApi(route, body) {
  await wait(90);
  if (route === "/api/config")
    return { gitAvailable: true, outputRoot: DEMO_OUTPUT_ROOT };

  if (route === "/api/art/preview") {
    // Same pure planner the real server uses, so commit counts are accurate.
    const { dates, ...preview } = createArtPlan(body);
    const previewId = id();
    plans.set(previewId, preview.total);
    return { ...preview, id: previewId };
  }

  if (route === "/api/generate") {
    const total = plans.get(body.previewId);
    if (total === undefined)
      throw new Error("Preview expired. Refresh it before generating.");
    const job = {
      id: id(),
      status: "running",
      completed: 0,
      total,
      folder: String(body.folder || "my-graffiti"),
      startedAt: Date.now(),
      duration: Math.min(4200, Math.max(1800, total * 4))
    };
    jobs.set(job.id, job);
    return snapshot(job);
  }

  if (route.startsWith("/api/jobs/")) {
    const job = jobs.get(route.split("/").pop());
    if (!job) throw new Error("Job not found.");
    return snapshot(job);
  }

  if (route === "/api/cancel") {
    const job = jobs.get(body.id);
    if (job && snapshot(job).status === "running") {
      job.status = "cancelled";
      job.error = "Cancelled. (Demo: nothing was created.)";
    }
    return { ok: true };
  }

  throw new Error("Unknown API endpoint.");
}
