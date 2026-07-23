import React from "react";

const getTheme = (): "dark" | "light" => {
  if (typeof document === "undefined") return "dark";

  const el = document.querySelector<HTMLElement>(
    '[data-theme="dark"], [data-theme="light"]',
  );

  return el?.dataset.theme === "light" ? "light" : "dark";
};

/**
 * Reads the active Agent Server UI theme (set by AgentServerUIRoot via
 * `data-theme`) and re-renders when it changes. Falls back to dark if no theme
 * is present, e.g. during SSR or tests.
 */
export function useAgentServerUITheme(): "dark" | "light" {
  return React.useSyncExternalStore(
    (callback) => {
      if (typeof document === "undefined") return () => {};

      const observer = new MutationObserver(callback);
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-theme"],
      });

      return () => observer.disconnect();
    },
    getTheme,
    () => "dark",
  );
}
