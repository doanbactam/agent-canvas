import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { ConversationTabEmptyState } from "#/components/features/conversation/conversation-tab-empty-state";

export function EmptyBrowserMessage() {
  const { t } = useTranslation("openhands");

  return (
    <ConversationTabEmptyState icon={<Globe />}>
      {t(I18nKey.BROWSER$NO_PAGE_LOADED)}
    </ConversationTabEmptyState>
  );
}
