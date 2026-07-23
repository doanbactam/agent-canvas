import React from "react";

interface CodeDiffContainerProps {
  height: number;
  children: React.ReactNode;
}

/**
 * Fixed-height wrapper for the diff/file viewer. FileDiff requires an explicit
 * height to enable its internal scrolling / virtualization.
 */
export function CodeDiffContainer({
  height,
  children,
}: CodeDiffContainerProps) {
  return (
    <div
      data-testid="code-diff-container"
      className="w-full border-b border-[var(--oh-border)] overflow-hidden h-[var(--editor-height)]"
      // CSS custom property plumbed through for h-[var(--editor-height)] above
      style={{ "--editor-height": `${height}px` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
