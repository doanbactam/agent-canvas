/// <reference types="vitest" />
/// <reference types="vite-plugin-svgr/client" />
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";
import { reactRouter } from "@react-router/dev/vite";
import { configDefaults } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import prefixer from "postcss-prefix-selector";
import {
  AGENT_SERVER_UI_SCOPE_SELECTOR,
  transformAgentServerUISelector,
} from "./src/styles/agent-server-ui-style-scope";

const LIB_ENTRY = fileURLToPath(new URL("./src/index.ts", import.meta.url));
const LIB_EXTERNALS = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-router",
];
const APP_CHUNK_MAX_BYTES = 450 * 1024;

// Languages registered by the Shiki-based SyntaxHighlighter. They are listed
// explicitly here because `optimizeDeps.noDiscovery` is enabled below; Vite
// needs to know about them ahead of time so it does not try to optimize them
// on first render, which Safari cannot recover from.
const SHIKI_LANGUAGES = [
  "bash",
  "batch",
  "c",
  "clojure",
  "cpp",
  "csharp",
  "css",
  "dart",
  "diff",
  "dockerfile",
  "elixir",
  "erlang",
  "fsharp",
  "go",
  "graphql",
  "groovy",
  "haskell",
  "hcl",
  "html",
  "http",
  "ini",
  "java",
  "javascript",
  "json",
  "json5",
  "jsx",
  "julia",
  "kotlin",
  "less",
  "lua",
  "makefile",
  "markdown",
  "matlab",
  "nginx",
  "nix",
  "objective-c",
  "ocaml",
  "perl",
  "php",
  "powershell",
  "properties",
  "protobuf",
  "python",
  "r",
  "regex",
  "ruby",
  "rust",
  "sass",
  "scala",
  "scss",
  "shellsession",
  "solidity",
  "sql",
  "swift",
  "toml",
  "tsx",
  "typescript",
  "xml",
  "yaml",
];

const normalizeBasePath = (value?: string) => {
  const raw = value?.trim();
  if (!raw || raw === "/") return "/";

  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return `${withLeadingSlash.replace(/\/+$/, "")}/`;
};

// Absolute path to the bundled extensions skills directory in node_modules.
// Injected as __EXTENSIONS_SKILLS_DIR__ so agent-server-adapter.ts can pass
// real filesystem paths to the Python agent-server (which uses them to
// resolve bundled skill resources like scripts/ and references/).
const _require = createRequire(import.meta.url);
const EXTENSIONS_SKILLS_DIR = resolve(
  dirname(_require.resolve("@openhands/extensions/package.json")),
  "skills",
);
const PUBLIC_LOCALES_DIR = resolve(process.cwd(), "public", "locales");

const appBuildConfig = {
  rolldownOptions: {
    output: {
      codeSplitting: {
        groups: [
          {
            // Keep the styling core (HeroUI + tailwind-variants + its
            // tailwind-merge/clsx deps) in one un-size-split chunk. When the
            // generic size-split vendor group slices these apart, a HeroUI
            // component's top-level `tv()` recipe can evaluate before
            // tailwind-variants' core is initialized, throwing
            // "TypeError: s is not a function" at module load and blanking the
            // whole app (root-layout module fails to load → reload loop).
            name: "vendor-styling",
            test: /node_modules[\\/](@heroui[\\/]|tailwind-variants[\\/]|tailwind-merge[\\/]|clsx[\\/])/,
          },
          {
            // Keep the markdown / syntax-highlight ecosystem
            // (Shiki, hast-util-to-html, and the unified/hast/mdast/micromark/
            // remark/rehype/vfile module tree it pulls in) in one un-size-split
            // chunk. Same failure mode as vendor-styling above: once the
            // file-viewer (HighlightedSourceView) is imported from a second route,
            // the generic size-split vendor group slices this tree across chunk
            // boundaries, so a vfile/unified module's interop `require` shim
            // can evaluate before the chunk that defines it, throwing
            // "TypeError: i is not a function" at module load and blanking the
            // whole app (the shared home/conversation/files-tab chunk fails to
            // load → route-module reload loop).
            name: "vendor-markdown",
            test: /node_modules[\\/](shiki[\\/]|@shikijs[\\/]|hastscript[\\/]|(hast|mdast|unist|micromark|remark|rehype)[^\\/]*[\\/]|unified[\\/]|vfile[^\\/]*[\\/]|property-information[\\/]|(comma|space)-separated-tokens[\\/]|character-entities[^\\/]*[\\/]|(parse|stringify)-entities[\\/]|decode-named-character-reference[\\/]|bail[\\/]|trough[\\/]|is-plain-obj[\\/]|zwitch[\\/]|longest-streak[\\/]|ccount[\\/]|escape-string-regexp[\\/]|markdown-table[\\/]|devlop[\\/])/,
          },
          {
            name: "vendor",
            test: /node_modules[\\/]/,
            maxSize: APP_CHUNK_MAX_BYTES,
            minSize: 20 * 1024,
            entriesAware: true,
          },
        ],
      },
    },
  },
};

export default defineConfig(({ mode }) => {
  const {
    VITE_BACKEND_HOST = "127.0.0.1:8000",
    VITE_USE_TLS = "false",
    VITE_FRONTEND_PORT = "3001",
    VITE_INSECURE_SKIP_VERIFY = "false",
    VITE_BASE_PATH,
  } = loadEnv(mode, process.cwd());

  const isLibraryBuild = process.env.BUILD_LIB === "true";
  const USE_TLS = VITE_USE_TLS === "true";
  const INSECURE_SKIP_VERIFY = VITE_INSECURE_SKIP_VERIFY === "true";
  const PROTOCOL = USE_TLS ? "https" : "http";
  const WS_PROTOCOL = USE_TLS ? "wss" : "ws";

  const API_URL = `${PROTOCOL}://${VITE_BACKEND_HOST}/`;
  const WS_URL = `${WS_PROTOCOL}://${VITE_BACKEND_HOST}/`;
  const FE_PORT = Number.parseInt(VITE_FRONTEND_PORT, 10);
  const base = normalizeBasePath(VITE_BASE_PATH);

  return {
    base,
    define: {
      // Empty string for library builds so consumers aren't bound to this
      // machine's node_modules path; agent-server-adapter falls back to
      // "public" when the value is falsy.
      __EXTENSIONS_SKILLS_DIR__: JSON.stringify(
        isLibraryBuild ? "" : EXTENSIONS_SKILLS_DIR,
      ),
    },
    plugins: [
      {
        name: "suppress-chrome-devtools-well-known",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use(
            "/.well-known/appspecific/com.chrome.devtools.json",
            (_req, res) => {
              res.writeHead(204);
              res.end();
            },
          );
        },
      },
      {
        name: "serve-generated-i18n-locales",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const method = req.method ?? "GET";
            if (method !== "GET" && method !== "HEAD") {
              next();
              return;
            }

            const pathname = new URL(req.url ?? "", "http://localhost")
              .pathname;
            if (
              !pathname.startsWith("/locales/") ||
              !pathname.endsWith(".json")
            ) {
              next();
              return;
            }

            const requestedPath = decodeURIComponent(
              pathname.slice("/locales/".length),
            );
            const filePath = resolve(PUBLIC_LOCALES_DIR, requestedPath);
            const relativePath = relative(PUBLIC_LOCALES_DIR, filePath);
            if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
              res.writeHead(403);
              res.end();
              return;
            }

            try {
              const content = await readFile(filePath);
              res.writeHead(200, {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-cache",
              });
              res.end(method === "HEAD" ? "" : content);
            } catch {
              next();
            }
          });
        },
      },
      !process.env.VITEST && !isLibraryBuild && reactRouter(),
      svgr(),
      tailwindcss(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    css: {
      postcss: {
        plugins: [
          prefixer({
            prefix: AGENT_SERVER_UI_SCOPE_SELECTOR,
            transform(
              prefix: string,
              selector: string,
              prefixedSelector: string,
            ) {
              return transformAgentServerUISelector(
                prefix,
                selector,
                prefixedSelector,
              );
            },
          }),
        ],
      },
    },
    build: isLibraryBuild
      ? {
          outDir: "dist",
          emptyOutDir: true,
          sourcemap: true,
          lib: {
            entry: LIB_ENTRY,
            formats: ["es"],
          },
          rollupOptions: {
            external: LIB_EXTERNALS,
            output: [
              {
                format: "es",
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "[name].js",
                chunkFileNames: "chunks/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
              },
              {
                format: "cjs",
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "[name].cjs",
                chunkFileNames: "chunks/[name]-[hash].cjs",
                assetFileNames: "assets/[name]-[hash][extname]",
                exports: "named",
              },
            ],
          },
        }
      : appBuildConfig,
    copyPublicDir: !isLibraryBuild,
    optimizeDeps: {
      // Disable discovery of new deps at runtime. All deps must be listed in
      // `include`. This prevents Vite from returning 504s while optimizing
      // newly-discovered deps - Safari doesn't retry like Chrome does.
      noDiscovery: true,
      include: [
        // Pre-bundle client entry dependencies so the first page load does not 504
        // with Vite's "Outdated Optimize Dep" before hydration finishes.
        // Safari is particularly sensitive to runtime dep optimization - it gets
        // stuck in 504 errors when Vite triggers "optimized dependencies changed. reloading"
        "react",
        "react/jsx-runtime",
        "react-dom/client",
        "react-router/dom",
        // Pre-bundle ALL dependencies to prevent runtime optimization and page reloads
        // These are discovered during initial app load:
        "posthog-js",
        "@tanstack/react-query",
        "react-hot-toast",
        "i18next",
        "i18next-http-backend",
        "i18next-browser-languagedetector",
        "react-i18next",
        "@uidotdev/usehooks",
        "ofetch",
        "clsx",
        "tailwind-merge",
        // CJS dependencies used by react-transition-group. Without pre-bundling,
        // Vite can serve them directly to the browser before route hydration.
        "prop-types",
        "react-is",
        "@heroui/react",
        "lucide-react",
        "socket.io-client",
        "@pierre/diffs",
        "@pierre/diffs/react",
        "react-textarea-autosize",
        "react-markdown",
        "remark-gfm",
        "remark-breaks",
        // Shiki syntax highlighting (core, engine, themes, and the explicit
        // language allowlist used by SyntaxHighlighter). Pre-bundled here
        // because `noDiscovery` is enabled; runtime optimization of these
        // ESM subpaths triggers reload loops in Safari.
        "shiki",
        "shiki/core",
        "shiki/engine/javascript",
        "shiki/themes/dark-plus.mjs",
        "shiki/themes/light-plus.mjs",
        ...SHIKI_LANGUAGES.map((lang) => `shiki/langs/${lang}.mjs`),
        // Terminal dependencies - added to prevent runtime optimization
        "@xterm/addon-fit",
        "@xterm/xterm",
        "@xterm/xterm/css/xterm.css",
        // OpenHands typescript client
        "@openhands/typescript-client",
        "@openhands/typescript-client/client/http-client",
        "@openhands/typescript-client/client/device-flow-client",
        "@openhands/typescript-client/clients",
        "@openhands/typescript-client/events/remote-events-list",
        "@openhands/typescript-client/workspace/remote-workspace",
        // Additional dependencies discovered at runtime
        "class-variance-authority",
        "downshift",
        "framer-motion",
        "rehype-raw",
        "rehype-sanitize",
        // ``shell-quote`` is a CJS module used by ``src/utils/acp-command.ts``
        // for the Settings → Agent textarea. With ``noDiscovery: true`` above,
        // omitting it from this list means Vite serves the raw CJS file to
        // the browser and dev crashes with ``ReferenceError: exports is not
        // defined`` on the first import of agent-settings.tsx.
        "shell-quote",
        "unist-util-visit",
        "uuid",
        "zustand",
        "zustand/middleware",
      ],
    },
    server: {
      port: FE_PORT,
      strictPort: true, // Fail if port is busy (dynamic allocation handles fallback)
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/server_info": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/alive": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/health": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/ready": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/docs": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/redoc": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/openapi.json": {
          target: API_URL,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
        "/sockets": {
          target: WS_URL,
          ws: true,
          changeOrigin: true,
          secure: !INSECURE_SKIP_VERIFY,
        },
      },
      watch: {
        ignored: ["**/node_modules/**", "**/.git/**"],
      },
    },
    ssr: {
      // Shiki subpaths and @shikijs/* engine/theme packages are ESM and use
      // dynamic imports for the wasm/grammar catalog; bundling them avoids
      // Node resolution issues during SSR.
      noExternal: ["shiki", /^@shikijs\//],
    },
    clearScreen: false,
    test: {
      environment: "jsdom",
      setupFiles: ["vitest.setup.ts"],
      exclude: [...configDefaults.exclude, "tests"],
      // The full suite runs many DOM-heavy tests in parallel, which can
      // push individual `userEvent`-driven tests past Vitest's 5000ms
      // default on busy machines (the skills-settings and i18n
      // namespace tests are the typical victims). Bumping the global
      // timeout keeps these tests deterministic without changing any
      // production behavior.
      testTimeout: 30000,
      hookTimeout: 30000,
      server: {
        deps: {
          inline: ["@openhands/typescript-client"],
        },
      },
      coverage: {
        reporter: ["text", "json", "html", "lcov", "text-summary"],
        reportsDirectory: "coverage",
        include: ["src/**/*.{ts,tsx}"],
      },
    },
  };
});
