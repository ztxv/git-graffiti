import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { AnimatedButton } from "./interface-motion";
export function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "dark"
  );
  const reduced = useReducedMotion();
  const dark = theme === "dark";
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    setTheme(next);
    try {
      localStorage.setItem("git-graffiti-theme", next);
    } catch {}
  }
  return (
    <AnimatedButton
      type="button"
      className="header-icon theme-toggle"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{
            opacity: 0,
            rotate: reduced ? 0 : -35,
            scale: reduced ? 1 : 0.8
          }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{
            opacity: 0,
            rotate: reduced ? 0 : 35,
            scale: reduced ? 1 : 0.8
          }}
          transition={{ duration: reduced ? 0 : 0.13 }}
        >
          {dark ? (
            <Sun size={18} aria-hidden="true" />
          ) : (
            <Moon size={18} aria-hidden="true" />
          )}
        </motion.span>
      </AnimatePresence>
    </AnimatedButton>
  );
}
