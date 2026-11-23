import { ArrowUpRight, Circle } from "lucide-react";

const DEMO_REPO_URL = "https://github.com/ztxv/git-graffiti";

// Shown only in the hosted demo build. Keeps the "nothing here is real" promise
// visible without getting in the way of the studio itself.
export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <span className="demo-banner-label">
        <Circle size={7} className="eyebrow-dot" aria-hidden="true" />
        LIVE DEMO
      </span>
      <span className="demo-banner-text">
        Go ahead, paint, stamp, undo. Nothing is saved or committed here.
      </span>
      <a href={DEMO_REPO_URL} target="_blank" rel="noopener noreferrer">
        Run it locally for real <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </div>
  );
}
