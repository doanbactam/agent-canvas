import { ListTree } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { sortFilesByPriority } from "#/utils/file-priority";
import { cn } from "#/utils/utils";

interface FileQuickRowProps {
  paths: string[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  /** Whether the left-hand file tree is currently visible. */
  isTreeVisible: boolean;
  /** Toggle the visibility of the left-hand file tree. */
  onToggleTree: () => void;
}

// Cap the number of quick-access pills so a giant workspace doesn't force
// the browser to measure/render hundreds of absolutely-positioned overflow
// items in this row. The full list is always available in the file tree.
const MAX_QUICK_FILES = 20;

/**
 * Horizontal "quick access" row of files at the top of the file viewer.
 * Important entrypoints (index.html, README.md, package.json, …) appear
 * first. A file-tree toggle on the leading edge shows or hides the full
 * tree on the left — there is no overflow dropdown, so anything that doesn't fit
 * here is reachable by opening the tree.
 */
export function FileQuickRow({
  paths,
  selectedPath,
  onSelectFile,
  isTreeVisible,
  onToggleTree,
}: FileQuickRowProps) {
  const { t } = useTranslation("openhands");

  const sortedByPriority = useMemo(() => sortFilesByPriority(paths), [paths]);

  const displayPaths = useMemo<string[]>(() => {
    // Make sure the selected file is always visible in the quick row even
    // if it falls outside the top N by priority.
    const inList = selectedPath ? paths.includes(selectedPath) : false;
    const head = inList && selectedPath ? [selectedPath] : [];
    return [
      ...head,
      ...sortedByPriority.filter((p) => p !== selectedPath),
    ].slice(0, MAX_QUICK_FILES);
  }, [sortedByPriority, selectedPath, paths]);

  const overflowCount = Math.max(0, paths.length - displayPaths.length);

  return (
    <div
      className="flex items-center gap-1.5 border-b border-[var(--oh-border)] px-2 py-1.5 min-h-[34px]"
      data-testid="file-quick-row"
    >
      <button
        type="button"
        onClick={onToggleTree}
        data-testid="file-quick-row-tree-toggle"
        aria-pressed={isTreeVisible}
        aria-label={t(
          isTreeVisible
            ? I18nKey.FILES$HIDE_FILE_TREE
            : I18nKey.FILES$SHOW_FILE_TREE,
        )}
        title={t(
          isTreeVisible
            ? I18nKey.FILES$HIDE_FILE_TREE
            : I18nKey.FILES$SHOW_FILE_TREE,
        )}
        className={cn(
          "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md cursor-pointer",
          "text-[var(--oh-text-tertiary)] hover:bg-tertiary",
          isTreeVisible && "bg-[var(--oh-surface-raised)]",
        )}
      >
        <ListTree className="w-3 h-3" aria-hidden strokeWidth={2} />
      </button>

      {displayPaths.length > 0 && (
        <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          {displayPaths.map((path) => {
            const isSelected = selectedPath === path;
            return (
              <button
                key={path}
                type="button"
                onClick={() => onSelectFile(path)}
                title={path}
                data-testid={`file-quick-row-item-${path}`}
                className={cn(
                  "inline-flex items-center px-2 py-0.5 text-xs whitespace-nowrap rounded-md cursor-pointer",
                  isSelected
                    ? "bg-[var(--oh-interactive-hover)] text-white"
                    : "bg-[var(--oh-surface-raised)] text-[var(--oh-text-tertiary)] hover:bg-tertiary",
                )}
              >
                {path}
              </button>
            );
          })}
          {overflowCount > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 text-xs whitespace-nowrap rounded-md text-[var(--oh-muted)] bg-[var(--oh-surface-raised)]"
              title={t(I18nKey.FILES$MORE_FILES)}
              data-testid="file-quick-row-more"
            >
              +{overflowCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
