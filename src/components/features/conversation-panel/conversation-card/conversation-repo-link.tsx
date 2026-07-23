import { GitBranch } from "lucide-react";
import type { RepositorySelection } from "#/api/open-hands.types";
import { GitProviderIcon } from "#/components/shared/git-provider-icon";

interface ConversationRepoLinkProps {
  selectedRepository: RepositorySelection;
}

export function ConversationRepoLink({
  selectedRepository,
}: ConversationRepoLinkProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      <div className="flex min-w-0 items-center gap-1">
        {selectedRepository.git_provider && (
          <GitProviderIcon
            gitProvider={selectedRepository.git_provider}
            className="h-3.5 w-3.5 shrink-0 text-[var(--oh-muted)]"
          />
        )}
        <span
          data-testid="conversation-card-selected-repository"
          className="min-w-0 truncate text-xs text-[var(--oh-muted)]"
        >
          {selectedRepository.selected_repository}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <GitBranch className="h-3 w-3 shrink-0 text-[var(--oh-muted)]" />

        <span
          data-testid="conversation-card-selected-branch"
          className="min-w-0 truncate text-xs text-[var(--oh-muted)]"
        >
          {selectedRepository.selected_branch}
        </span>
      </div>
    </div>
  );
}
