import { describe, it, expect } from "vitest";

import {
  getShikiLanguageForExtension,
  getShikiLanguageForFile,
} from "#/utils/file-language";

describe("getShikiLanguageForExtension", () => {
  it("maps code-fence / file extensions to Shiki language ids", () => {
    expect(getShikiLanguageForExtension("js")).toBe("javascript");
    expect(getShikiLanguageForExtension("ts")).toBe("typescript");
    expect(getShikiLanguageForExtension("py")).toBe("python");
    expect(getShikiLanguageForExtension("rs")).toBe("rust");
    expect(getShikiLanguageForExtension("sh")).toBe("bash");
    expect(getShikiLanguageForExtension("dockerfile")).toBe("dockerfile");
  });

  it("is case-insensitive", () => {
    expect(getShikiLanguageForExtension("JS")).toBe("javascript");
  });

  it("returns null for unknown extensions", () => {
    expect(getShikiLanguageForExtension("xyz")).toBeNull();
  });
});

describe("getShikiLanguageForFile", () => {
  it("maps common source-code extensions to their Shiki language ids", () => {
    expect(getShikiLanguageForFile("src/index.ts")).toBe("typescript");
    expect(getShikiLanguageForFile("src/App.tsx")).toBe("tsx");
    expect(getShikiLanguageForFile("scripts/build.js")).toBe("javascript");
    expect(getShikiLanguageForFile("main.py")).toBe("python");
    expect(getShikiLanguageForFile("server.go")).toBe("go");
    expect(getShikiLanguageForFile("lib/util.rs")).toBe("rust");
    expect(getShikiLanguageForFile("Cargo.toml")).toBe("toml");
  });

  it("maps web / markup files to grammars", () => {
    expect(getShikiLanguageForFile("index.html")).toBe("html");
    expect(getShikiLanguageForFile("page.htm")).toBe("html");
    expect(getShikiLanguageForFile("logo.svg")).toBe("html");
    expect(getShikiLanguageForFile("feed.xml")).toBe("xml");
    expect(getShikiLanguageForFile("styles/main.css")).toBe("css");
    expect(getShikiLanguageForFile("styles/main.scss")).toBe("scss");
    expect(getShikiLanguageForFile("README.md")).toBe("markdown");
    expect(getShikiLanguageForFile("docs/guide.mdx")).toBe("markdown");
  });

  it("recognizes well-known no-extension filenames", () => {
    expect(getShikiLanguageForFile("Dockerfile")).toBe("dockerfile");
    expect(getShikiLanguageForFile("path/to/Dockerfile")).toBe("dockerfile");
    expect(getShikiLanguageForFile("Makefile")).toBe("makefile");
    expect(getShikiLanguageForFile(".bashrc")).toBe("bash");
    expect(getShikiLanguageForFile(".gitignore")).toBe("bash");
  });

  it("is case-insensitive on the extension", () => {
    expect(getShikiLanguageForFile("README.MD")).toBe("markdown");
    expect(getShikiLanguageForFile("Util.PY")).toBe("python");
  });

  it("falls back on mime type when no extension matches", () => {
    expect(getShikiLanguageForFile("LICENSE", "text/markdown")).toBe(
      "markdown",
    );
    expect(getShikiLanguageForFile("data", "application/json")).toBe("json");
    expect(getShikiLanguageForFile("config", "text/yaml")).toBe("yaml");
  });

  it("returns null for unknown extensions and unknown mime types", () => {
    // No extension, no mime type, no known basename → bail out so the
    // caller can render a raw <pre>.
    expect(getShikiLanguageForFile("LICENSE")).toBeNull();
    expect(getShikiLanguageForFile("data.xyz")).toBeNull();
    expect(
      getShikiLanguageForFile("data.bin", "application/octet-stream"),
    ).toBeNull();
  });

  it("does not confuse a dot-prefix file with an extension", () => {
    // `.env` is a basename, not "extension = env".
    expect(getShikiLanguageForFile(".env")).toBe("bash");
    expect(getShikiLanguageForFile(".dockerignore")).toBe("bash");
  });
});
