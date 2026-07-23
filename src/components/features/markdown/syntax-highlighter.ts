import React, { useEffect, useMemo } from "react";
import { createHighlighterCoreSync, hastToHtml } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { Element, Root } from "hast";
import type {
  LanguageRegistration,
  ShikiTransformer,
  ThemeRegistration,
} from "@shikijs/types";
import { useAgentServerUITheme } from "#/hooks/use-agent-server-ui-theme";
import { cn } from "#/utils/utils";
import { getShikiLanguageForExtension } from "#/utils/file-language";
import { SHIKI_LANGUAGE_REGISTRY } from "#/utils/shiki-language-registry";

import darkPlus from "shiki/themes/dark-plus.mjs";
import lightPlus from "shiki/themes/light-plus.mjs";

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
 * Maps the loaded module variables to their `shiki/langs/<name>.mjs` file names.
 * The canonical id -> module-name mapping lives in `shiki-language-registry.ts`
 * so both the highlighter and `vite.config.ts` share one source of truth.
 */
const IMPORTED_MODULES_BY_NAME: Record<string, LanguageRegistration[]> = {
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

const LANGUAGE_MODULES: Record<string, LanguageRegistration[]> =
  Object.fromEntries(
    Object.entries(SHIKI_LANGUAGE_REGISTRY).map(([id, moduleName]) => [
      id,
      IMPORTED_MODULES_BY_NAME[moduleName],
    ]),
  );

const TEXT_ALIASES = new Set(["text", "txt", "plain", "plaintext"]);

const CODE_FENCE_ALIASES: Record<string, string> = {
  console: "bash",
  shell: "bash",
  shellscript: "bash",
  docker: "dockerfile",
  make: "makefile",
  mk: "makefile",
  terraform: "hcl",
  "c++": "cpp",
  objc: "objective-c",
  https: "http",
  xhtml: "html",
};

type ThemeName = "dark-plus" | "light-plus";

/**
 * All grammars are loaded at module initialization time. This keeps the
 * component render path pure (no side effects inside `useMemo`) while still
 * giving synchronous highlighting for `react-markdown` code blocks.
 */
const highlighter = createHighlighterCoreSync({
  themes: [darkPlus as ThemeRegistration, lightPlus as ThemeRegistration],
  langs: [...new Set(Object.values(LANGUAGE_MODULES))],
  engine: createJavaScriptRegexEngine(),
});

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

function useLineNumberStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const id = "shiki-line-numbers-css";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = LINE_NUMBER_CSS;
    document.head.appendChild(style);
  }, []);
}

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

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function parseStyleString(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  style.split(";").forEach((declaration) => {
    const colon = declaration.indexOf(":");
    if (colon === -1) return;

    const key = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!key || !value) return;

    result[key] = value;
  });
  return result;
}

function styleRecordToString(
  style: Record<string, string | number | undefined>,
): string {
  return Object.entries(style)
    .filter(
      ([, value]) => value !== undefined && value !== "" && value !== null,
    )
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(";");
}

function mergeStyleProperties(
  base: Record<string, string>,
  additions: React.CSSProperties | undefined,
): Record<string, string> {
  if (!additions) return base;

  const merged = { ...base };
  Object.entries(additions).forEach(([key, value]) => {
    if (value == null || value === "") return;

    const kebab = key.startsWith("--") ? key : camelToKebab(key);
    merged[kebab] = String(value);
  });

  return merged;
}

function resolveCodeFenceLanguage(language: string | undefined): string {
  if (!language) return "text";

  const hint = language.toLowerCase().trim();
  if (hint === "" || TEXT_ALIASES.has(hint)) return "text";

  const alias = CODE_FENCE_ALIASES[hint];
  if (alias) return alias;

  const fromExtension = getShikiLanguageForExtension(hint);
  if (fromExtension) return fromExtension;

  if (highlighter.getLoadedLanguages().includes(hint)) return hint;

  return "text";
}

/* eslint-disable no-param-reassign */
function buildHighlighterTransformer(
  options: HighlightOptions,
): ShikiTransformer {
  const {
    className,
    customStyle,
    wrapLongLines,
    showLineNumbers,
    lineNumberStyle,
    codeTagProps,
  } = options;

  function mergeClassList(
    existing: string | undefined,
    additions: string[] | undefined,
  ): string {
    const classes = new Set((existing ?? "").split(/\s+/).filter(Boolean));
    additions?.forEach((cls) => classes.add(cls));
    return [...classes].join(" ");
  }

  return {
    name: "agent-canvas-syntax-highlighter",
    pre(node) {
      // `tabindex="0"` is added by Shiki but is unnecessary for read-only code
      // blocks and can steal focus from surrounding controls.
      delete node.properties.tabindex;

      const additions: string[] = [];
      if (showLineNumbers) additions.push("shiki-line-numbers");
      if (className) additions.push(className);

      node.properties.class = mergeClassList(
        node.properties.class as string | undefined,
        additions,
      );

      const style = parseStyleString((node.properties.style as string) ?? "");

      // Strip the theme's default background/color so the block inherits the
      // surrounding surface color. Callers can override through `customStyle`.
      delete style["background-color"];
      delete style["color"];

      if (lineNumberStyle?.color) {
        style["--shiki-line-number-color"] = String(lineNumberStyle.color);
      }

      if (wrapLongLines) {
        style["white-space"] = "pre-wrap";
        style["word-wrap"] = "break-word";
      }

      const mergedPreStyle = mergeStyleProperties(style, customStyle);

      const styleStr = styleRecordToString(mergedPreStyle);
      if (styleStr) {
        node.properties.style = styleStr;
      } else {
        delete node.properties.style;
      }
    },
    code(node) {
      if (!codeTagProps) return;

      if (codeTagProps.className) {
        node.properties.class = mergeClassList(
          node.properties.class as string | undefined,
          [codeTagProps.className],
        );
      }

      if (codeTagProps.style) {
        const style = parseStyleString((node.properties.style as string) ?? "");
        const mergedCodeStyle = mergeStyleProperties(style, codeTagProps.style);

        const styleStr = styleRecordToString(mergedCodeStyle);
        if (styleStr) {
          node.properties.style = styleStr;
        } else {
          delete node.properties.style;
        }
      }
    },
  };
}
/* eslint-enable no-param-reassign */

function highlightCode(
  code: string,
  language: string | undefined,
  theme: ThemeName,
  options: HighlightOptions,
): HighlightResult {
  const lang = resolveCodeFenceLanguage(language);
  const transformer = buildHighlighterTransformer(options);

  let root: Root;
  try {
    root = highlighter.codeToHast(code, {
      lang,
      theme,
      mergeSameStyleTokens: true,
      transformers: [transformer],
    });
  } catch {
    // Defensive fallback to plain text if a grammar fails at runtime.
    root = highlighter.codeToHast(code, {
      lang: "text",
      theme,
      mergeSameStyleTokens: true,
      transformers: [transformer],
    });
  }

  const pre = root.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "pre",
  );

  if (!pre) {
    return {
      codeHtml: `<code>${escapeHtml(code)}</code>`,
      rootClass: cn(
        options.showLineNumbers && "shiki-line-numbers",
        options.className,
      ),
      rootStyle: "",
    };
  }

  const codeEl = pre.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code",
  );

  const codeHtml = codeEl
    ? hastToHtml(codeEl)
    : hastToHtml(pre.children as unknown as Element[]);

  return {
    codeHtml,
    rootClass: String(pre.properties.class ?? ""),
    rootStyle: String(pre.properties.style ?? ""),
  };
}

function styleStringToObject(style: string): React.CSSProperties {
  const obj: React.CSSProperties = {};
  style.split(";").forEach((declaration) => {
    const colon = declaration.indexOf(":");
    if (colon === -1) return;

    const key = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!key || !value) return;

    const reactKey = key.startsWith("--")
      ? key
      : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    (obj as Record<string, string>)[reactKey] = value;
  });
  return obj;
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
  useLineNumberStyles();

  const theme: ThemeName =
    useAgentServerUITheme() === "dark" ? "dark-plus" : "light-plus";

  const code =
    typeof children === "string"
      ? children.replace(/\n$/, "")
      : String(children);

  const { codeHtml, rootClass, rootStyle } = useMemo(
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
