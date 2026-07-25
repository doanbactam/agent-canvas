import { ACP_CUSTOM_PRESET_KEY } from "#/constants/acp-providers";
import type { SettingsFieldSchema } from "#/types/settings";
import { coerceFieldValue } from "#/utils/sdk-settings-schema";
import { formatCommand } from "#/utils/acp-command";

/**
 * Variant-specific AgentProfile fields derived from the form state. The
 * OpenHands branch omits `llm_profile_ref` — the profile editor supplies it.
 */
export type AgentProfileFieldsDraft =
  | {
      agent_kind: "openhands";
      enable_sub_agents: boolean;
      tool_concurrency_limit?: number;
    }
  | {
      agent_kind: "acp";
      acp_server: string;
      acp_model: string | null;
      acp_command: string | null;
      acp_args: string[] | null;
    };

/** Live form state the pure {@link buildAgentProfileFields} builder reads. */
export interface AgentProfileFieldsInput {
  isAcp: boolean;
  /** Detected ACP preset: a provider key or the `custom` sentinel. */
  selectedPreset: string;
  /** True when the command exactly matches the selected provider's default. */
  isDefaultProviderCommand: boolean;
  commandTokens: string[];
  acpModel: string;
  subAgentsEnabled: boolean;
  toolConcurrencyField?: SettingsFieldSchema;
  toolConcurrency: string | boolean;
}

/**
 * Translate the live Agent-settings form state into the variant-specific
 * AgentProfile fields. Pure (no React), so it can be unit-tested directly.
 *
 * ACP: a built-in provider on its default command stores **no** explicit
 * command (`acp_command: null` — the profile resolver falls back to the
 * provider default); a customized or `custom` command is stored verbatim as a
 * shell string. OpenHands: reuses the schema-driven `tool_concurrency_limit`
 * coercion, which **throws** on invalid input (callers catch at save time). A
 * blank concurrency field always emits an explicit value (the schema default
 * when the coercion is empty) rather than omitting the key — the profile
 * editor's save is a whole-profile overwrite (`mergeAgentProfileSaveInput`
 * spreads the stored profile under these fields), so omitting the key would
 * let a stale stored value silently survive an edit meant to clear it back to
 * the default (#1571 review). The backend field itself is a non-nullable
 * `int` with `ge=1`, so the default — not `null` — is the value that
 * actually clears.
 */
export function buildAgentProfileFields(
  input: AgentProfileFieldsInput,
): AgentProfileFieldsDraft {
  const {
    isAcp,
    selectedPreset,
    isDefaultProviderCommand,
    commandTokens,
    acpModel,
    subAgentsEnabled,
    toolConcurrencyField,
    toolConcurrency,
  } = input;
  if (isAcp) {
    const isBuiltinDefault =
      isDefaultProviderCommand && selectedPreset !== ACP_CUSTOM_PRESET_KEY;
    return {
      agent_kind: "acp",
      acp_server: selectedPreset,
      acp_model: acpModel.trim() || null,
      acp_command: isBuiltinDefault
        ? null
        : formatCommand(commandTokens) || null,
      acp_args: null,
    };
  }
  const fields: Extract<AgentProfileFieldsDraft, { agent_kind: "openhands" }> =
    {
      agent_kind: "openhands",
      enable_sub_agents: subAgentsEnabled,
    };
  if (toolConcurrencyField) {
    // Reuse the schema-driven coercion/validation; throws on bad input.
    const coerced = coerceFieldValue(toolConcurrencyField, toolConcurrency);
    // A blank field coerces to `null`. Always emit an explicit value — never
    // omit the key — so a deliberate clear on an edit-save actually resets the
    // stored profile to the schema default, instead of the whole-profile merge
    // silently carrying the old value forward.
    const fallback =
      typeof toolConcurrencyField.default === "number"
        ? toolConcurrencyField.default
        : 1;
    fields.tool_concurrency_limit =
      coerced != null ? Number(coerced) : fallback;
  }
  return fields;
}
