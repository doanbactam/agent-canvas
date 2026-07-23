import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CodeDiffContainer } from "./code-diff-container";

describe("CodeDiffContainer", () => {
  it("renders children", () => {
    render(
      <CodeDiffContainer height={400}>
        <div data-testid="child" />
      </CodeDiffContainer>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders with the code-diff-container test id", () => {
    render(
      <CodeDiffContainer height={300}>
        <div data-testid="inner" />
      </CodeDiffContainer>,
    );
    expect(screen.getByTestId("code-diff-container")).toBeInTheDocument();
  });

  // Functional contract: the `height` prop is observable only via the
  // `--editor-height` CSS custom property the component writes to the DOM.
  it("sets the --editor-height CSS variable based on height prop", () => {
    render(
      <CodeDiffContainer height={500}>
        <div data-testid="inner" />
      </CodeDiffContainer>,
    );
    const container = screen.getByTestId("code-diff-container");
    expect(container.style.getPropertyValue("--editor-height")).toBe("500px");
  });
});
