import { useTranslation } from "react-i18next";
import { cn } from "#/utils/utils";
import { Typography } from "#/ui/typography";
import { I18nKey } from "#/i18n/declaration";

interface ToolParametersProps {
  parameters: Record<string, unknown>;
}

export function ToolParameters({ parameters }: ToolParametersProps) {
  const { t } = useTranslation("openhands");

  return (
    <div className="mt-2" data-testid="tool-parameters">
      <Typography.Text className="text-sm font-semibold text-text-tertiary">
        {t(I18nKey.SYSTEM_MESSAGE_MODAL$PARAMETERS)}
      </Typography.Text>
      <div className="text-sm mt-2 p-3 bg-base rounded-md overflow-auto text-text-tertiary max-h-[400px] border border-border">
        <pre
          className={cn(
            "font-mono text-xs whitespace-pre-wrap break-all",
            "text-text-tertiary",
          )}
        >
          {JSON.stringify(parameters, null, 2)}
        </pre>
      </div>
    </div>
  );
}
