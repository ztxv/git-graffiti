// Adapted from shadcn/ui's MIT-licensed New York Button registry source.
// https://ui.shadcn.com/r/styles/new-york/button.json
import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button--primary",
      outline: "ui-button--outline",
      ghost: "ui-button--ghost"
    },
    size: {
      default: "ui-button--default",
      sm: "ui-button--sm",
      icon: "ui-button--icon"
    }
  },
  defaultVariants: { variant: "ghost", size: "sm" }
});
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={twMerge(clsx(buttonVariants({ variant, size }), className))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button, buttonVariants };
