import React from "react";
import { createHighlighterCoreSync, hastToHtml } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { Element, Root } from "hast";
import type { LanguageRegistration, ThemeRegistration } from "@shikijs/types";
import { useAgentServerUITheme } from "#/hooks/use-agent-server-ui-theme";
import { cn } from "#/utils/utils";
import { getShikiLanguageForFile } from "#/utils/file-language";

// Theme imports – keep these few because they are loaded into the highlighter
// at creation time. Background/color are stripped later so the block inherits
// the surrounding surface color instead of using the theme's hard-coded values.
import darkPlus from "shiki/themes/dark-plus.mjs";
import lightPlus from "shiki/themes/light-plus.mjs";

// Language grammar imports. We only import the modules here; grammars are
// compiled on first use by `loadLanguageSync` so creation stays instant.
import batch from "shiki/langs/batch.mjs";
import c from "shiki/langs/c.mjs";
import clojure from "shiki/langs/clojure.mjs";
import cpp from "shiki/langs/cpp.mjs";
import csharp from "shiki/langs/csharp.mjs";
import css from "shiki/langs/css.mjs";
import dart from "shiki/langs/dart.mjs";
import diff from "shiki/langs/diff.mjs";
import dockerfile from "shiki/langs/dockerfile.mjs";
import elixir from "shiki/langs/elixir.mjs";
import erlang from "shiki/langs/erlang.mjs";
import fsharp from "shiki/langs/fsharp.mjs";
import go from "shiki/langs/go.mjs";
import graphql from "shiki/langs/graphql.mjs";
import groovy from "shiki/langs/groovy.mjs";
import haskell from "shiki/langs/haskell.mjs";
import hcl from "shiki/langs/hcl.mjs";
import html from "shiki/langs/html.mjs";
import http from "shiki/langs/http.mjs";
import ini from "shiki/langs/ini.mjs";
import java from "shiki/langs/java.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import json5 from "shiki/langs/json5.mjs";
import jsx from "shiki/langs/jsx.mjs";
import julia from "shiki/langs/julia.mjs";
import kotlin from "shiki/langs/kotlin.mjs";
import less from "shiki/langs/less.mjs";
import lua from "shiki/langs/lua.mjs";
import makefile from "shiki/langs/makefile.mjs";
import markdown from "shiki/langs/markdown.mjs";
import matlab from "shiki/langs/matlab.mjs";
import nginx from "shiki/langs/nginx.mjs";
import nix from "shiki/langs/nix.mjs";
import objectiveC from "shiki/langs/objective-c.mjs";
import ocaml from "shiki/langs/ocaml.mjs";
import perl from "shiki/langs/perl.mjs";
import php from "shiki/langs/php.mjs";
import powershell from "shiki/langs/powershell.mjs";
import properties from "shiki/langs/properties.mjs";
import protobuf from "shiki/langs/protobuf.mjs";
import python from "shiki/langs/python.mjs";
import r from "shiki/langs/r.mjs";
import regex from "shiki/langs/regex.mjs";
import ruby from "shiki/langs/ruby.mjs";
import rust from "shiki/langs/rust.mjs";
import sass from "shiki/langs/sass.mjs";
import scala from "shiki/langs/scala.mjs";
import scss from "shiki/langs/scss.mjs";
import shellsession from "shiki/langs/shellsession.mjs";
import solidity from "shiki/langs/solidity.mjs";
import sql from "shiki/langs/sql.mjs";
import swift from "shiki/langs/swift.mjs";
import toml from "shiki/langs/toml.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import xml from "shiki/langs/xml.mjs";
import yaml from "shiki/langs/yaml.mjs";

/**
 * Maps the canonical language ids returned by `getShikiLanguageForFile` (and by
 * `resolveCodeLanguage` for code-fence hints) to the Shiki grammar module that
 * should be loaded. Several ids can point to the same module (e.g. `bash` and
 * `shellsession` both load the shellsession grammar).
 */
const LANGUAGE_MODULES: Record<string, LanguageRegistration[]> = {
  bash: shellsession,
  batch,
  c,
  clojure,
  cpp,
  csharp,
  css,
  dart,
  diff,
  dockerfile,
  elixir,
  erlang,
  fsharp,
  go,
  graphql,
  groovy,
  haskell,
  hcl,
  html,
  http,
  ini,
  java,
  javascript,
  json,
  json5,
  jsx,
  julia,
  kotlin,
  less,
  lua,
  makefile,
  markdown,
  matlab,
  nginx,
  nix,
  "objective-c": objectiveC,
  ocaml,
  perl,
  php,
  powershell,
  properties,
  protobuf,
  python,
  r,
  regex,
  ruby,
  rust,
  sass,
  scala,
  scss,
  shellsession,
  solidity,
  sql,
  swift,
  toml,
  tsx,
  typescript,
  xml,
  yaml,
};

/**
 * Aliases that are not already covered by the file-extension mapping. These are
 * usually code-fence language hints like `console` or `shell`.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "bash",
  shell: "bash",
  shellscript: "bash",
  console: "bash",
  zsh: "bash",
  sh: "bash",
  fish: "bash",
  docker: "dockerfile",
  make: "makefile",
  mk: "makefile",
  gql: "graphql",
  gradle: "groovy",
  terraform: "hcl",
  "c++": "cpp",
  cxx: "cpp",
  cc: "cpp",
  hpp: "cpp",
  hh: "cpp",
  objc: "objective-c",
  text: "text",
  txt: "text",
  plain: "text",
  plaintext: "text",
  https: "http",
  xhtml: "html",
  htm: "html",
};

/**
 * Global stylesheet for CSS-based line numbers. It is injected once the first
 * time a component with `showLineNumbers` is rendered. The color can be
 * overridden per-instance through the `--shiki-line-number-color` custom
 * property, which falls back to the app's border color.
 */
const LINE_NUMBER_CSS = `
  .shiki-line-numbers { counter-reset: line; }
  .shiki-line-numbers .line::before {
    counter-increment: line;
    content: counter(line);
    display: inline-block;
    width: 2.5em;
    margin-right: 1em;
    text-align: right;
    color: var(--shiki-line-number-color, var(--oh-border));
    user-select: none;
  }
`;

if (typeof document !== "undefined") {
  const id = "shiki-line-numbers-css";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = LINE_NUMBER_CSS;
    document.head.appendChild(style);
  }
}

const highlighter = createHighlighterCoreSync({
  themes: [darkPlus as ThemeRegistration, lightPlus as ThemeRegistration],
  langs: [],
  engine: createJavaScriptRegexEngine(),
});

type ThemeName = "dark-plus" | "light-plus";

export interface SyntaxHighlighterProps {
  language?: string;
  children: string;
  className?: string;
  showLineNumbers?: boolean;
  wrapLongLines?: boolean;
  PreTag?: "pre" | "div";
  customStyle?: React.CSSProperties;
  lineNumberStyle?: React.CSSProperties;
  codeTagProps?: React.HTMLAttributes<HTMLElement>;
}

interface HighlightResult {
  codeHtml: string;
  rootClass: string;
  rootStyle: string;
}

type HighlightOptions = Omit<SyntaxHighlighterProps, "children" | "language">;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cssObjectToString(style: React.CSSProperties): string {
  return Object.entries(style)
    .map(([k, v]) => {
      if (v == null || v === "") return "";
      const key = k.startsWith("--")
        ? k
        : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return `${key}:${String(v)}`;
    })
    .filter(Boolean)
    .join(";");
}

function resolveLanguage(language: string | undefined): string {
  if (!language) return "text";
  const hint = language.toLowerCase().trim();
  if (["text", "txt", "plain", "plaintext"].includes(hint)) return "text";

  const alias = LANGUAGE_ALIASES[hint];
  if (alias && ensureLanguageLoaded(alias)) return alias;

  const fromExtension = getShikiLanguageForFile(`x.${hint}`);
  if (fromExtension && ensureLanguageLoaded(fromExtension))
    return fromExtension;

  if (ensureLanguageLoaded(hint)) return hint;

  return "text";
}

function ensureLanguageLoaded(id: string): string | null {
  if (highlighter.getLoadedLanguages().includes(id)) return id;
  const mod = LANGUAGE_MODULES[id];
  if (mod) {
    try {
      highlighter.loadLanguageSync(mod);
      return id;
    } catch {
      // Fall back to plain text if a grammar fails to load.
    }
  }
  return null;
}

function highlightCode(
  code: string,
  language: string | undefined,
  theme: ThemeName,
  props: HighlightOptions,
): HighlightResult {
  const {
    className,
    showLineNumbers,
    wrapLongLines,
    customStyle,
    lineNumberStyle,
    codeTagProps,
  } = props;

  const lang = resolveLanguage(language);
  let root: Root;
  try {
    root = highlighter.codeToHast(code, {
      lang,
      theme,
      mergeSameStyleTokens: true,
    });
  } catch {
    root = highlighter.codeToHast(escapeHtml(code), { lang: "text", theme });
  }

  const pre = root.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "pre",
  );

  if (!pre) {
    return {
      codeHtml: `<code>${escapeHtml(code)}</code>`,
      rootClass: cn(showLineNumbers && "shiki-line-numbers", className),
      rootStyle: "",
    };
  }

  let preStyle = ((pre.properties.style as string) || "").trim();
  preStyle = preStyle
    .replace(/(?:^|;)\s*background-color:[^;]+;?/g, "")
    .replace(/(?:^|;)\s*color:[^;]+;?/g, "")
    .trim();

  if (customStyle) {
    const custom = cssObjectToString(customStyle);
    if (custom) preStyle = preStyle ? `${preStyle};${custom}` : custom;
  }

  if (wrapLongLines) {
    const wrap = "white-space:pre-wrap;word-wrap:break-word";
    preStyle = preStyle ? `${preStyle};${wrap}` : wrap;
  }

  if (lineNumberStyle?.color) {
    const lineColor = `--shiki-line-number-color:${String(lineNumberStyle.color)}`;
    preStyle = preStyle ? `${preStyle};${lineColor}` : lineColor;
  }

  let preClass = ((pre.properties.class as string | undefined) ?? "").trim();
  if (showLineNumbers) {
    preClass = preClass
      ? `${preClass} shiki-line-numbers`
      : "shiki-line-numbers";
  }
  if (className) {
    preClass = preClass ? `${preClass} ${className}` : className;
  }

  // `tabindex="0"` is added by Shiki but is unnecessary for read-only code
  // blocks and can steal focus from surrounding controls.
  delete pre.properties.tabindex;

  const codeEl = pre.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code",
  );

  if (codeEl && codeTagProps) {
    if (codeTagProps.className) {
      codeEl.properties.class =
        `${((codeEl.properties.class as string) ?? "").trim()} ${codeTagProps.className}`.trim();
    }
    if (codeTagProps.style) {
      const extra = cssObjectToString(
        codeTagProps.style as React.CSSProperties,
      );
      const existing = ((codeEl.properties.style as string) || "").trim();
      codeEl.properties.style =
        existing && extra ? `${existing};${extra}` : existing || extra;
    }
  }

  const codeHtml = hastToHtml(codeEl ?? pre.children);
  return { codeHtml, rootClass: preClass, rootStyle: preStyle };
}

export function SyntaxHighlighter({
  language,
  children,
  className,
  showLineNumbers = false,
  wrapLongLines = false,
  PreTag = "pre",
  customStyle,
  lineNumberStyle,
  codeTagProps,
}: SyntaxHighlighterProps) {
  const theme: ThemeName =
    useAgentServerUITheme() === "dark" ? "dark-plus" : "light-plus";
  const code =
    typeof children === "string"
      ? children.replace(/\n$/, "")
      : String(children);
  const { codeHtml, rootClass, rootStyle } = React.useMemo(
    () =>
      highlightCode(code, language, theme, {
        className,
        showLineNumbers,
        wrapLongLines,
        customStyle,
        lineNumberStyle,
        codeTagProps,
      }),
    [
      code,
      language,
      theme,
      className,
      showLineNumbers,
      wrapLongLines,
      customStyle,
      lineNumberStyle,
      codeTagProps,
    ],
  );

  return React.createElement(PreTag, {
    className: rootClass,
    style: styleStringToObject(rootStyle),
    dangerouslySetInnerHTML: { __html: codeHtml },
  });
}

function styleStringToObject(style: string): React.CSSProperties {
  const obj: React.CSSProperties = {};
  style.split(";").forEach((decl) => {
    const colon = decl.indexOf(":");
    if (colon === -1) return;
    const key = decl.slice(0, colon).trim();
    const value = decl.slice(colon + 1).trim();
    if (!key || !value) return;
    const reactKey = key.startsWith("--")
      ? key
      : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    (obj as Record<string, string>)[reactKey] = value;
  });
  return obj;
}
