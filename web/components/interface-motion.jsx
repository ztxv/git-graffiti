import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/button";
const MotionButton = motion.create(Button);
export function AnimatedButton({ disabled, ...props }) {
  const reduced = useReducedMotion();
  return (
    <MotionButton
      disabled={disabled}
      whileHover={disabled || reduced ? undefined : { y: -1 }}
      whileTap={disabled || reduced ? undefined : { scale: 0.97, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.16 }}
      {...props}
    />
  );
}
export function GenerationProgress({ completed, total }) {
  const reduced = useReducedMotion();
  return (
    <div
      className="generation-progress"
      role="progressbar"
      aria-label="Repository generation"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
    >
      <motion.div
        className="generation-progress-fill"
        initial={false}
        animate={{ scaleX: total ? completed / total : 0 }}
        transition={{ duration: reduced ? 0 : 0.3, ease: "easeOut" }}
      />
    </div>
  );
}
