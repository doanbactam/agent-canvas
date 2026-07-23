import { SlashCommandItem } from "#/hooks/chat/use-slash-command";

export const PRODUCT_URL = {
  PRODUCTION: "https://app.all-hands.dev",
};

export const SETTINGS_FORM = {
  LABEL_CLASSNAME: "text-[11px] font-medium leading-4 tracking-[0.11px]",
};

// Chat input constants
export const CHAT_INPUT = {
  HEIGHT_THRESHOLD: 100, // Height in pixels when suggestions should be hidden
};

// UI tolerance constants
export const EPS = 1.5; // px tolerance for "near min" height comparisons

/** The /btw slash command — asks a side question via the ask_agent endpoint. */
export const BTW_COMMAND = "/btw";

/** The /model slash command — lists or switches the conversation's LLM profile. */
export const MODEL_COMMAND = "/model";

/** The /goal slash command — drives the agent toward an objective, judging completion each round. */
export const GOAL_COMMAND = "/goal";

/** Built-in slash commands surfaced in the menu for V1 conversations. */
export const BUILT_IN_COMMANDS: SlashCommandItem[] = [
  {
    skill: {
      name: "new",
      type: "agentskills",
      content: "Creates a new conversation using the same runtime",
      triggers: ["/new"],
    },
    command: "/new",
  },
  {
    skill: {
      name: "btw",
      type: "agentskills",
      content: "Ask the agent a side question without derailing the main task",
      triggers: [BTW_COMMAND],
    },
    command: BTW_COMMAND,
  },
  {
    skill: {
      name: "model",
      type: "agentskills",
      content:
        "List saved LLM profiles, or switch the conversation LLM profile with /model <name>",
      triggers: [MODEL_COMMAND],
    },
    command: MODEL_COMMAND,
  },
  {
    skill: {
      name: "goal",
      type: "agentskills",
      content:
        "Drive the agent toward an objective until a judge says it's done — /goal <objective> or /goal --max <n> <objective>",
      triggers: [GOAL_COMMAND],
    },
    command: GOAL_COMMAND,
  },
];

// Skill content metadata prefixes
export const METADATA_PREFIXES: readonly string[] = [
  "The following information has been included",
  "It may or may not be relevant",
  "Skill location:",
  "(Use this path to resolve",
];
