import React from "react";
import { useTranslation } from "react-i18next";
import { FileDiff, File } from "@pierre/diffs/react";
import { parseDiffFromFile, type FileDiffMetadata } from "@pierre/diffs";
import {
  FileDiff as FileDiffIcon,
  FileMinus,
  FilePlus,
  History,
  GitCompareArrows,
  FileCheck,
  type LucideIcon,
} from "lucide-react";
import { GitChangeStatus } from "#/api/open-hands.types";
import { I18nKey } from "#/i18n/declaration";
import { getShikiLanguageForFile } from "#/utils/file-language";
import { cn } from "#/utils/utils";
import { useAgentServerUITheme } from "#/hooks/use-agent-server-ui-theme";
import { useUnifiedGitDiff } from "#/hooks/query/use-unified-git-diff";
import { MarkdownRenderer } from "#/components/features/markdown/markdown-renderer";
import { Typography } from "#/ui/typography";
import ChevronUp from "#/icons/chveron-up.svg?react";
import { LoadingSpinner } from "./loading-spinner";
import { CodeDiffContainer } from "./code-diff-container";

type ViewMode = "diff" | "old" | "new";

const VIEW_MODES: { mode: ViewMode; icon: LucideIcon }[] = [
  { mode: "old", icon: History },
  { mode: "diff", icon: GitCompareArrows },
  { mode: "new", icon: FileCheck },
];

const STATUS_MAP: Record<GitChangeStatus, string | LucideIcon> = {
  A: FilePlus,
  D: FileMinus,
  M: FileDiffIcon,
  R: "Renamed",
  U: "Untracked",
};

const DIFF_EDITOR_HEIGHT = 400;

const FILE_DIFF_THEMES = {
  dark: "pierre-dark",
  light: "pierre-light",
} as const;

export interface FileDiffViewerProps {
  path: string;
  type: GitChangeStatus;
  /**
   * When set, show the file's diff as changed by this commit instead of
   * the working-tree-vs-base diff. Deleted files render their content in
   * commit mode (both sides come from git objects).
   */
  commit?: string;
}

function splitRenamePath(path: string) {
  const trimmed = path.trim();

  const braceMatch = trimmed.match(/^(.*)\{(.*?)\s*(?:=>|->)\s*(.*?)\}(.*)$/);
  if (braceMatch) {
    const [, prefix, oldPart, newPart, suffix] = braceMatch;
    return {
      oldName: `${prefix}${oldPart}${suffix}`.trim() || path,
      newName: `${prefix}${newPart}${suffix}`.trim() || path,
    };
  }

  const arrowMatch = trimmed.match(/^(.*?)\s*(?:=>|->)\s*(.*)$/);
  if (arrowMatch) {
    return {
      oldName: arrowMatch[1].trim() || path,
      newName: arrowMatch[2].trim() || path,
    };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return { oldName: parts[0], newName: parts[parts.length - 1] };
  }

  return { oldName: path, newName: path };
}

export function FileDiffViewer({ path, type, commit }: FileDiffViewerProps) {
  const { t } = useTranslation("openhands");
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<ViewMode>("diff");
  const uiTheme = useAgentServerUITheme();

  const isAdded = type === "A" || type === "U";
  const isDeleted = type === "D";
  const isRenamed = type === "R";

  const { oldName, newName } = React.useMemo(
    () =>
      isRenamed ? splitRenamePath(path) : { oldName: path, newName: path },
    [path, isRenamed],
  );

  const filePath = newName;

  const {
    data: diff,
    isLoading,
    isSuccess,
    isRefetching,
  } = useUnifiedGitDiff({
    filePath,
    type,
    enabled: !isCollapsed,
    commit,
  });

  const language = getShikiLanguageForFile(filePath) ?? "text";
  const isMarkdownFile = language === "markdown";
  const isFetchingData = isLoading || isRefetching;

  const fileDiff: FileDiffMetadata | null = React.useMemo(() => {
    if (!isSuccess || !diff) return null;

    const original = isAdded ? "" : (diff.original ?? "");
    const modified = isDeleted ? "" : (diff.modified ?? "");

    try {
      return parseDiffFromFile(
        { name: oldName, contents: original, lang: language },
        { name: newName, contents: modified, lang: language },
      );
    } catch (error) {
      // Defensive fallback: parseDiffFromFile can fail on malformed/empty
      // inputs. Log the real failure and show a non-loading fallback message.
      console.error("Failed to parse diff for", filePath, error);
      return null;
    }
  }, [isSuccess, diff, oldName, newName, language, isAdded, isDeleted]);

  const status = (type === "U" ? STATUS_MAP.A : STATUS_MAP[type]) || "?";
  const statusIcon =
    typeof status === "string" ? (
      <Typography.Text>{status}</Typography.Text>
    ) : (
      React.createElement(status, { className: "w-5 h-5" })
    );

  const renderContent = () => {
    if (isMarkdownFile && viewMode !== "diff") {
      const content = viewMode === "old" ? diff?.original : diff?.modified;
      return (
        <div
          className="w-full border-b border-[var(--oh-border)] overflow-auto p-4 bg-base prose prose-invert max-w-none"
          data-testid="markdown-preview"
        >
          <MarkdownRenderer
            content={content ?? ""}
            includeStandard
            includeHeadings
          />
        </div>
      );
    }

    if (viewMode === "diff") {
      if (!fileDiff) {
        return (
          <div
            className="w-full border-b border-[var(--oh-border)] p-4 bg-base text-[var(--oh-text-dim)] text-sm"
            data-testid="file-diff-empty"
          >
            {t(I18nKey.ERROR$GENERIC)}
          </div>
        );
      }

      return (
        <CodeDiffContainer height={DIFF_EDITOR_HEIGHT}>
          <FileDiff
            fileDiff={fileDiff}
            className="h-full w-full"
            options={{
              theme: FILE_DIFF_THEMES,
              themeType: uiTheme,
              diffStyle: isAdded || isDeleted ? "unified" : "split",
              disableFileHeader: true,
            }}
          />
        </CodeDiffContainer>
      );
    }

    const content = viewMode === "old" ? diff?.original : diff?.modified;
    return (
      <CodeDiffContainer height={DIFF_EDITOR_HEIGHT}>
        <File
          file={{ name: filePath, contents: content ?? "", lang: language }}
          className="h-full w-full"
          options={{
            theme: FILE_DIFF_THEMES,
            themeType: uiTheme,
            disableFileHeader: true,
          }}
        />
      </CodeDiffContainer>
    );
  };

  return (
    <div data-testid="file-diff-viewer-outer" className="w-full flex flex-col">
      <div
        className="flex justify-between items-center px-3 py-2.5 border-b border-[var(--oh-border)] hover:cursor-pointer"
        onClick={() => setIsCollapsed((prev) => !prev)}
      >
        <span className="text-sm w-full text-content flex items-center gap-2">
          {isFetchingData ? <LoadingSpinner className="w-4 h-4" /> : statusIcon}
          <strong className="w-full truncate font-medium">{filePath}</strong>
          {!isCollapsed && !isDeleted && (
            <span
              className="flex items-center gap-0.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {VIEW_MODES.map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  data-testid={`view-mode-${mode}`}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "p-1 rounded transition-colors cursor-pointer",
                    viewMode === mode
                      ? "bg-[var(--oh-interactive-hover)] text-white"
                      : "text-[var(--oh-muted)] hover:bg-[var(--oh-interactive-hover)] hover:text-white",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </span>
          )}
          <button data-testid="collapse" type="button">
            <ChevronUp
              className={cn(
                "w-4 h-4 transition-transform",
                isCollapsed && "transform rotate-180",
              )}
            />
          </button>
        </span>
      </div>

      {!isCollapsed && isDeleted && !commit && (
        <div
          data-testid="file-deleted-message"
          className="w-full border-b border-[var(--oh-border)] p-4 bg-base text-[var(--oh-text-dim)] text-sm"
        >
          {t(I18nKey.DIFF_VIEWER$FILE_DELETED)}
        </div>
      )}

      {!isCollapsed && (!isDeleted || !!commit) && isSuccess && renderContent()}
    </div>
  );
}
