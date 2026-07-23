import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SyntaxHighlighter } from "#/components/features/markdown/syntax-highlighter";

describe("SyntaxHighlighter", () => {
  it("renders highlighted JavaScript code", () => {
    const { container } = render(
      <SyntaxHighlighter language="js" className="my-class">
        console.log(&quot;hello&quot;)
      </SyntaxHighlighter>,
    );

    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre).toHaveClass("my-class", "shiki");
    expect(pre?.innerHTML).toContain("<code");
    expect(pre?.textContent).toContain('console.log("hello")');
  });

  it("supports line numbers", () => {
    const { container } = render(
      <SyntaxHighlighter
        language="js"
        showLineNumbers
        lineNumberStyle={{ color: "#abc" }}
      >
        line1 line2
      </SyntaxHighlighter>,
    );

    const pre = container.querySelector("pre");
    expect(pre).toHaveClass("shiki-line-numbers");
    expect(pre?.getAttribute("style")).toContain(
      "--shiki-line-number-color: #abc",
    );
  });

  it("wraps long lines", () => {
    const { container } = render(
      <SyntaxHighlighter language="js" wrapLongLines>
        console.log(&quot;hello&quot;);
      </SyntaxHighlighter>,
    );

    const pre = container.querySelector("pre");
    expect(pre?.getAttribute("style")).toContain("white-space: pre-wrap");
  });

  it("uses PreTag prop", () => {
    const { container } = render(
      <SyntaxHighlighter language="js" PreTag="div">
        x
      </SyntaxHighlighter>,
    );

    expect(container.querySelector("div")).toBeInTheDocument();
    expect(container.querySelector("pre")).not.toBeInTheDocument();
  });

  it("falls back to plain text for unknown languages", () => {
    const { container } = render(
      <SyntaxHighlighter language="some-unknown-lang">
        some code
      </SyntaxHighlighter>,
    );

    const pre = container.querySelector("pre");
    expect(pre?.textContent).toContain("some code");
  });

  it("applies codeTagProps to the inner <code>", () => {
    const { container } = render(
      <SyntaxHighlighter
        language="js"
        codeTagProps={{
          className: "code-cls",
          style: { background: "transparent" },
        }}
      >
        x
      </SyntaxHighlighter>,
    );

    const code = container.querySelector("code");
    expect(code).toHaveClass("code-cls");
    expect(code?.getAttribute("style")).toContain("background:transparent");
  });
});
