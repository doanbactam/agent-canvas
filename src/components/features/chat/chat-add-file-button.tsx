import React from "react";
import { Paperclip, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { chatInputIconButtonClassName } from "#/utils/form-control-classes";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useConversationNameContextMenu } from "#/hooks/use-conversation-name-context-menu";
import { ToolsContextMenu } from "#/components/features/controls/tools-context-menu";
const SystemMessageModal = React.lazy(() =>
  import("#/components/features/conversation-panel/system-message-modal").then(
    (m) => ({ default: m.SystemMessageModal }),
  ),
);
const SkillsModal = React.lazy(() =>
  import("#/components/features/conversation-panel/skills-modal").then((m) => ({
    default: m.SkillsModal,
  })),
);
const PluginsModal = React.lazy(() =>
  import("#/components/features/conversation-panel/plugins-modal").then(
    (m) => ({
      default: m.PluginsModal,
    }),
  ),
);
const HooksModal = React.lazy(() =>
  import("#/components/features/conversation-panel/hooks-modal").then((m) => ({
    default: m.HooksModal,
  })),
);

export interface ChatAddFileButtonProps {
  handleFileIconClick: () => void;
  disabled?: boolean;
}

export function ChatAddFileButton({
  handleFileIconClick,
  disabled = false,
}: ChatAddFileButtonProps) {
  const { t } = useTranslation("openhands");
  const { conversationId } = useOptionalConversationId();
  const { data: conversation } = useActiveConversation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const {
    handleShowAgentTools,
    handleShowSkills,
    handleShowPlugins,
    handleShowHooks,
    systemModalVisible,
    setSystemModalVisible,
    skillsModalVisible,
    setSkillsModalVisible,
    pluginsModalVisible,
    setPluginsModalVisible,
    hooksModalVisible,
    setHooksModalVisible,
    systemMessage,
    shouldShowAgentTools,
    shouldShowHooks,
    shouldShowPlugins,
  } = useConversationNameContextMenu({
    conversationId: conversationId ?? undefined,
    executionStatus: conversation?.execution_status,
    showOptions: true,
    onContextMenuToggle: setMenuOpen,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setMenuOpen((open) => !open);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          chatInputIconButtonClassName,
          "relative shrink-0 size-6",
          disabled
            ? "cursor-not-allowed text-[var(--oh-text-subtle)]"
            : undefined,
          menuOpen && !disabled && "text-white bg-white/10",
        )}
        aria-label={t(I18nKey.CHAT_INTERFACE$PLUS_MENU)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        data-testid="chat-plus-button"
        onClick={handleClick}
        disabled={disabled}
      >
        <span className="flex h-full w-full items-center justify-center">
          <Plus className="h-[13px] w-[13px] shrink-0" strokeWidth={2} />
        </span>
      </button>

      {menuOpen && (
        <ToolsContextMenu
          onClose={() => setMenuOpen(false)}
          onShowSkills={handleShowSkills}
          onShowPlugins={handleShowPlugins}
          onShowHooks={handleShowHooks}
          onShowAgentTools={handleShowAgentTools}
          shouldShowAgentTools={shouldShowAgentTools}
          shouldShowHooks={shouldShowHooks}
          shouldShowPlugins={shouldShowPlugins}
          footerAction={{
            testId: "add-files-and-images-button",
            icon: (
              <Paperclip
                className="h-4 w-4 shrink-0"
                strokeWidth={2}
                aria-hidden
              />
            ),
            label: t(I18nKey.CHAT_INTERFACE$ADD_FILES_AND_IMAGES),
            onClick: handleFileIconClick,
          }}
        />
      )}

      <React.Suspense fallback={null}>
        {systemModalVisible && (
          <SystemMessageModal
            isOpen={systemModalVisible}
            onClose={() => setSystemModalVisible(false)}
            systemMessage={systemMessage || null}
          />
        )}
        {skillsModalVisible && (
          <SkillsModal onClose={() => setSkillsModalVisible(false)} />
        )}
        {pluginsModalVisible && (
          <PluginsModal onClose={() => setPluginsModalVisible(false)} />
        )}
        {hooksModalVisible && (
          <HooksModal onClose={() => setHooksModalVisible(false)} />
        )}
      </React.Suspense>
    </div>
  );
}
