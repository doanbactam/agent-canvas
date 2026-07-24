/**
 * Shared file-type classification used by the workspace file reader and the
 * file-content previewer. Keeping extension → MIME / kind / label lookups in
 * one place removes duplication between `useWorkspaceFileContent` and
 * `FileContentViewer` and makes it easy to add new previewable formats.
 */

export type WorkspaceFileKind = "text" | "image" | "pdf" | "binary";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "svg",
  "avif",
]);

const PDF_EXTENSIONS = new Set(["pdf"]);

/** Formats we render as raw HTML (or HTML-like markup) in an iframe. */
const HTML_LIKE_EXTS = new Set(["html", "htm", "svg"]);

/** Formats we render with the markdown renderer in rich mode. */
const MARKDOWN_EXTS = new Set(["md", "markdown", "mdx"]);

/** Office/document formats we can't preview inline. */
const OFFICE_DOCUMENT_LABELS: Record<string, string> = {
  pptx: "PowerPoint",
  ppt: "PowerPoint",
  docx: "Word",
  doc: "Word",
  xlsx: "Excel",
  xls: "Excel",
};

export function getFileExtension(path: string): string {
  // Mirror the basename-aware extension parser in file-language.ts so
  // backslash paths, dotfiles, and files without an extension behave the
  // same across the codebase.
  const slashIdx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const basename = path.slice(slashIdx + 1);
  const dotIdx = basename.lastIndexOf(".");
  if (dotIdx <= 0) return "";
  return basename.slice(dotIdx + 1).toLowerCase();
}

export function isImageExtension(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toLowerCase());
}

export function isPdfExtension(ext: string): boolean {
  return PDF_EXTENSIONS.has(ext.toLowerCase());
}

export function isHtmlLikeExtension(ext: string): boolean {
  return HTML_LIKE_EXTS.has(ext.toLowerCase());
}

export function isMarkdownExtension(ext: string): boolean {
  return MARKDOWN_EXTS.has(ext.toLowerCase());
}

export function getOfficeDocumentLabel(ext: string): string | undefined {
  return OFFICE_DOCUMENT_LABELS[ext.toLowerCase()];
}

export function guessMimeType(path: string): string {
  const ext = getFileExtension(path);
  switch (ext) {
    case "html":
    case "htm":
      return "text/html";
    case "css":
      return "text/css";
    case "js":
    case "mjs":
    case "cjs":
      return "text/javascript";
    case "json":
      return "application/json";
    case "md":
    case "markdown":
      return "text/markdown";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "ico":
      return "image/x-icon";
    case "avif":
      return "image/avif";
    case "pdf":
      return "application/pdf";
    default:
      return "text/plain";
  }
}

export function classifyFileKind(path: string): WorkspaceFileKind {
  const ext = getFileExtension(path);
  if (isImageExtension(ext)) return "image";
  if (isPdfExtension(ext)) return "pdf";
  // Everything else is treated as text and decoded; if decoding produces
  // null bytes we fall back to "binary" downstream.
  return "text";
}
