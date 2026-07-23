import React from "react";
import { useTranslation } from "react-i18next";
import { FileDiff, File } from "@pierre/diffs/react";
import { parseDiffFromFile, type FileDiffMetadata } from "@pierre/diffs";
import {
  LuFileDiff,
  LuFileMinus,
  LuFilePlus,
  LuHistory,
  LuGitCompareArrows,
  LuFileCheck,
} from "react-icons/lu";
import { IconType } from "react-icons/lib";
import { GitChangeStatus } from "#/api/open-hands.types";
import { I18nKey } from "#/i18n/declaration";
import { getLanguageFromPath } from "#/utils/get-language-from-path";
import { cn } from "#/utils/utils";
import { useUnifiedGitDiff } from "#/hooks/query/use-unified-git-diff";
import { MarkdownRenderer } from "#/components/features/markdown/markdown-renderer";
import { Typography } from "#/ui/typography";
import ChevronUp from "#/icons/chveron-up.svg?react";
import { LoadingSpinner } from "./loading-spinner";
import { EditorContainer } from "./editor-container";

type ViewMode = "diff" | "old" | "new";

const VIEW_MODES: { mode: ViewMode; icon: IconType }[] = [
  { mode: "old", icon: LuHistory },
  { mode: "diff", icon: LuGitCompareArrows },
  { mode: "new", icon: LuFileCheck },
];

const STATUS_MAP: Record<GitChangeStatus, string | IconType> = {
  A: LuFilePlus,
  D: LuFileMinus,
  M: LuFileDiff,
  R: "Renamed",
  U: "Untracked",
};

const DIFF_EDITOR_HEIGHT = 400;

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

export function FileDiffViewer({ path, type, commit }: FileDiffViewerProps) {
  const { t } = useTranslation("openhands");
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<ViewMode>("diff");

  const isAdded = type === "A" || type === "U";
  const isDeleted = type === "D";

  const filePath = React.useMemo(() => {
    if (type === "R") {
      const parts = path.split(/\s+/).slice(1);
      return parts[parts.length - 1];
    }
    return path;
  }, [path, type]);

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

  const language = getLanguageFromPath(filePath);
  const isMarkdownFile = language === "markdown";
  const isFetchingData = isLoading || isRefetching;

  const fileDiff: FileDiffMetadata | null = React.useMemo(() => {
    if (!isSuccess || !diff) return null;

    const original = isAdded ? "" : (diff.original ?? "");
    const modified = isDeleted ? "" : (diff.modified ?? "");

    try {
      return parseDiffFromFile(
        { name: filePath, contents: original, lang: language },
        { name: filePath, contents: modified, lang: language },
      );
    } catch {
      // Fall back to a minimal metadata object that will still render the new
      // file contents. This is defensive against edge cases where the diff
      // library cannot build a patch (e.g. identical files reported as changes).
      return null;
    }
  }, [isSuccess, diff, filePath, language, isAdded, isDeleted]);

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
            {t(I18nKey.DIFF_VIEWER$LOADING)}
          </div>
        );
      }

      return (
        <EditorContainer height={DIFF_EDITOR_HEIGHT}>
          <FileDiff
            fileDiff={fileDiff}
            className="h-full w-full"
            options={{
              theme: "pierre-dark",
              themeType: "dark",
              diffStyle: "split",
              disableFileHeader: true,
            }}
          />
        </EditorContainer>
      );
    }

    const content = viewMode === "old" ? diff?.original : diff?.modified;
    return (
      <EditorContainer height={DIFF_EDITOR_HEIGHT}>
        <File
          file={{ name: filePath, contents: content ?? "", lang: language }}
          className="h-full w-full"
          options={{
            theme: "pierre-dark",
            themeType: "dark",
            disableFileHeader: true,
          }}
        />
      </EditorContainer>
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
