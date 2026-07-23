import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutomationRunStatus } from "#/types/automation";
import type {
  Automation,
  AutomationRun,
  AutomationsResponse,
  AutomationRunsResponse,
} from "#/types/automation";
import type { Backend } from "#/api/backend-registry/types";

// Use vi.hoisted to define mocks that will be available during vi.mock hoisting
const {
  mockOfetch,
  localOfetch,
  mockGetActive,
  mockGetEffectiveLocal,
  mockCallCloudProxy,
  clearMocks,
} = vi.hoisted(() => {
  let onRequest:
    | ((ctx: { options: Record<string, unknown> }) => void | Promise<void>)
    | undefined;
  const local = vi.fn();
  const ofetch = vi.fn(
    async (url: string, options?: Record<string, unknown>) => {
      const opts = options ?? {};
      if (typeof onRequest === "function") {
        const ctx = { options: opts };
        await onRequest(ctx);
        options = ctx.options;
      }
      return local(url, options);
    },
  ) as typeof local & {
    create: (...args: any[]) => typeof ofetch;
  };
  ofetch.create = vi.fn((defaults: { onRequest?: typeof onRequest }) => {
    onRequest = defaults?.onRequest;
    return ofetch;
  }) as any;

  return {
    mockOfetch: ofetch,
    localOfetch: local,
    mockGetActive: vi.fn(),
    mockGetEffectiveLocal: vi.fn(),
    mockCallCloudProxy: vi.fn(),
    clearMocks: () => {
      local.mockClear();
      ofetch.mockClear();
    },
  };
});

vi.mock("ofetch", () => ({
  ofetch: mockOfetch,
}));

vi.mock("#/api/cloud/proxy", () => ({
  callCloudProxy: mockCallCloudProxy,
}));

vi.mock("#/api/backend-registry/active-store", () => ({
  getActiveBackend: mockGetActive,
  getEffectiveLocalBackend: mockGetEffectiveLocal,
}));

// Import after mocking
import AutomationService from "#/api/automation-service/automation-service.api";

const localBackend: Backend = {
  id: "local-1",
  name: "Local",
  host: "http://localhost:8000",
  apiKey: "session-key",
  kind: "local",
};

const cloudBackend: Backend = {
  id: "cloud-1",
  name: "Production",
  host: "https://app.all-hands.dev",
  apiKey: "bearer-key",
  kind: "cloud",
};

const mockAutomation: Automation = {
  id: "1",
  name: "Test Automation",
  prompt: "A test automation",
  trigger: { type: "schedule", schedule_human: "Daily at 09:00" },
  enabled: true,
  repository: "acme/repo",
  model: "daily-profile",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

const mockRun: AutomationRun = {
  id: "run-1",
  status: AutomationRunStatus.PENDING,
  conversation_id: null,
  bash_command_id: null,
  error_detail: null,
  started_at: "2026-01-03T00:00:00Z",
  completed_at: null,
};

describe("AutomationService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearMocks();
    mockGetActive.mockReset();
    mockGetActive.mockReturnValue({ backend: localBackend, orgId: null });
    mockGetEffectiveLocal.mockReset();
    mockGetEffectiveLocal.mockReturnValue(localBackend);
    mockCallCloudProxy.mockReset();
  });

  describe("listAutomations", () => {
    it("fetches paginated automations list with params object", async () => {
      const response: AutomationsResponse = {
        automations: [mockAutomation],
        total: 1,
      };
      localOfetch.mockResolvedValueOnce(response);

      const result = await AutomationService.listAutomations({
        limit: 10,
        offset: 5,
      });

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1",
        expect.objectContaining({
          method: "GET",
          query: { limit: 10, offset: 5 },
        }),
      );
      expect(result).toEqual(response);
    });

    it("uses default params when none provided", async () => {
      const response: AutomationsResponse = {
        automations: [],
        total: 0,
      };
      localOfetch.mockResolvedValueOnce(response);

      await AutomationService.listAutomations();

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1",
        expect.objectContaining({
          method: "GET",
          query: { limit: 50, offset: 0 },
        }),
      );
    });

    it("resolves baseURL and X-Session-API-Key from the effective local backend", async () => {
      localOfetch.mockResolvedValueOnce({ automations: [], total: 0 });

      await AutomationService.listAutomations();

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1",
        expect.objectContaining({
          method: "GET",
          baseURL: localBackend.host,
          headers: expect.any(Object),
        }),
      );
    });
  });

  describe("getAutomations", () => {
    it("delegates to listAutomations", async () => {
      const response: AutomationsResponse = {
        automations: [mockAutomation],
        total: 1,
      };
      vi.spyOn(AutomationService, "listAutomations").mockResolvedValue(response);

      const result = await AutomationService.getAutomations(10, 5);

      expect(AutomationService.listAutomations).toHaveBeenCalledWith({
        limit: 10,
        offset: 5,
      });
      expect(result).toEqual(response);
    });
  });

  describe("getAutomation", () => {
    it("fetches a single automation by id", async () => {
      localOfetch.mockResolvedValueOnce(mockAutomation);

      const result = await AutomationService.getAutomation("1");

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1/1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(mockAutomation);
    });
  });

  describe("updateAutomation", () => {
    it("patches an automation with the provided body", async () => {
      const updated = { ...mockAutomation, name: "Updated Name" };
      localOfetch.mockResolvedValueOnce(updated);

      const result = await AutomationService.updateAutomation("1", {
        name: "Updated Name",
      });

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1/1",
        expect.objectContaining({
          method: "PATCH",
          body: { name: "Updated Name" },
        }),
      );
      expect(result).toEqual(updated);
    });

    it("sends model profile updates to the automation API", async () => {
      const updated = { ...mockAutomation, model: "careful-profile" };
      localOfetch.mockResolvedValueOnce(updated);

      const result = await AutomationService.updateAutomation("1", {
        model: "careful-profile",
      });

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1/1",
        expect.objectContaining({
          method: "PATCH",
          body: { model: "careful-profile" },
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe("dispatchAutomation", () => {
    it("posts to the dispatch endpoint", async () => {
      localOfetch.mockResolvedValueOnce(mockRun);

      const result = await AutomationService.dispatchAutomation("1");

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1/1/dispatch",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(mockRun);
    });
  });

  describe("deleteAutomation", () => {
    it("deletes an automation by id", async () => {
      localOfetch.mockResolvedValueOnce(undefined);

      await AutomationService.deleteAutomation("1");

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1/1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("listAutomationRuns", () => {
    it("fetches runs with params object", async () => {
      const response: AutomationRunsResponse = { runs: [], total: 0 };
      localOfetch.mockResolvedValueOnce(response);

      const result = await AutomationService.listAutomationRuns("1", {
        limit: 20,
        offset: 10,
      });

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1/1/runs",
        expect.objectContaining({
          method: "GET",
          query: { limit: 20, offset: 10 },
        }),
      );
      expect(result).toEqual(response);
    });

    it("uses default params when none provided", async () => {
      const response: AutomationRunsResponse = { runs: [], total: 0 };
      localOfetch.mockResolvedValueOnce(response);

      await AutomationService.listAutomationRuns("1");

      expect(localOfetch).toHaveBeenCalledWith(
        "/api/automation/v1/1/runs",
        expect.objectContaining({
          method: "GET",
          query: { limit: 50, offset: 0 },
        }),
      );
    });
  });

  describe("getAutomationRuns", () => {
    it("delegates to listAutomationRuns", async () => {
      const response: AutomationRunsResponse = { runs: [], total: 0 };
      vi.spyOn(AutomationService, "listAutomationRuns").mockResolvedValue(
        response,
      );

      const result = await AutomationService.getAutomationRuns("1", 25, 5);

      expect(AutomationService.listAutomationRuns).toHaveBeenCalledWith("1", {
        limit: 25,
        offset: 5,
      });
      expect(result).toEqual(response);
    });
  });

  describe("toggleAutomation", () => {
    it("delegates to updateAutomation with enabled field", async () => {
      const toggled = { ...mockAutomation, enabled: false };
      vi.spyOn(AutomationService, "updateAutomation").mockResolvedValue(
        toggled,
      );

      const result = await AutomationService.toggleAutomation("1", false);

      expect(AutomationService.updateAutomation).toHaveBeenCalledWith("1", {
        enabled: false,
      });
      expect(result).toEqual(toggled);
    });
  });

  describe("cloud routing", () => {
    beforeEach(() => {
      mockGetActive.mockReturnValue({ backend: cloudBackend, orgId: null });
    });

    it("listAutomations routes to callCloudProxy with pagination in the path", async () => {
      const response: AutomationsResponse = {
        automations: [mockAutomation],
        total: 1,
      };
      mockCallCloudProxy.mockResolvedValue(response);

      const result = await AutomationService.listAutomations({
        limit: 10,
        offset: 5,
      });

      expect(mockCallCloudProxy).toHaveBeenCalledWith({
        backend: cloudBackend,
        method: "GET",
        path: "/api/automation/v1?limit=10&offset=5",
      });
      expect(localOfetch).not.toHaveBeenCalled();
      expect(result).toEqual(response);
    });

    it("getAutomation routes to callCloudProxy with the id in the path", async () => {
      mockCallCloudProxy.mockResolvedValue(mockAutomation);

      const result = await AutomationService.getAutomation("abc");

      expect(mockCallCloudProxy).toHaveBeenCalledWith({
        backend: cloudBackend,
        method: "GET",
        path: "/api/automation/v1/abc",
      });
      expect(result).toEqual(mockAutomation);
    });

    it("dispatchAutomation forwards method POST via callCloudProxy", async () => {
      mockCallCloudProxy.mockResolvedValue(mockRun);

      const result = await AutomationService.dispatchAutomation("abc");

      expect(mockCallCloudProxy).toHaveBeenCalledWith({
        backend: cloudBackend,
        method: "POST",
        path: "/api/automation/v1/abc/dispatch",
      });
      expect(localOfetch).not.toHaveBeenCalled();
      expect(result).toEqual(mockRun);
    });

    it("updateAutomation forwards method PATCH and body via callCloudProxy", async () => {
      const updated = { ...mockAutomation, enabled: false };
      mockCallCloudProxy.mockResolvedValue(updated);

      const result = await AutomationService.updateAutomation("abc", {
        enabled: false,
      });

      expect(mockCallCloudProxy).toHaveBeenCalledWith({
        backend: cloudBackend,
        method: "PATCH",
        path: "/api/automation/v1/abc",
        body: { enabled: false },
      });
      expect(localOfetch).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it("deleteAutomation forwards method DELETE via callCloudProxy", async () => {
      mockCallCloudProxy.mockResolvedValue(undefined);

      await AutomationService.deleteAutomation("abc");

      expect(mockCallCloudProxy).toHaveBeenCalledWith({
        backend: cloudBackend,
        method: "DELETE",
        path: "/api/automation/v1/abc",
      });
      expect(localOfetch).not.toHaveBeenCalled();
    });

    it("checkHealth calls the cloud host with a fail-fast timeout and returns the upstream status", async () => {
      mockCallCloudProxy.mockResolvedValue({ status: "ok" });

      const result = await AutomationService.checkHealth();

      const call = mockCallCloudProxy.mock.calls[0]![0];
      expect(call.method).toBe("GET");
      expect(call.path).toBe("/api/automation/health");
      expect(call.timeoutSeconds).toBe(5);
      expect(localOfetch).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "ok" });
    });

    it("checkHealth resolves to an error status instead of throwing when the cloud call fails", async () => {
      mockCallCloudProxy.mockRejectedValue(new Error("proxy unreachable"));

      const result = await AutomationService.checkHealth();

      expect(result).toEqual({ status: "error" });
    });
  });

  describe("local backend request setup", () => {
    it("sets X-Session-API-Key from the effective local backend apiKey", async () => {
      mockGetEffectiveLocal.mockReturnValue({
        ...localBackend,
        apiKey: "runtime-injected-key",
      });
      localOfetch.mockResolvedValueOnce({ automations: [], total: 0 });

      await AutomationService.listAutomations();

      const [, options] = localOfetch.mock.calls[0];
      expect(options).toMatchObject({
        baseURL: localBackend.host,
        headers: expect.any(Object),
      });
      const headers = options?.headers as Headers;
      expect(headers.get("X-Session-API-Key")).toBe("runtime-injected-key");
    });

    it("does not set X-Session-API-Key when backend apiKey is empty", async () => {
      mockGetEffectiveLocal.mockReturnValue({
        ...localBackend,
        apiKey: "",
      });
      localOfetch.mockResolvedValueOnce({ automations: [], total: 0 });

      await AutomationService.listAutomations();

      const [, options] = localOfetch.mock.calls[0];
      expect(options?.headers).toBeUndefined();
    });

    it("sets baseURL from effective local backend host when not already set", async () => {
      mockGetEffectiveLocal.mockReturnValue({
        ...localBackend,
        host: "http://custom-host:9000",
        apiKey: "key",
      });
      localOfetch.mockResolvedValueOnce({ automations: [], total: 0 });

      await AutomationService.listAutomations();

      const [, options] = localOfetch.mock.calls[0];
      expect(options?.baseURL).toBe("http://custom-host:9000");
    });

    it("does not overwrite an already-set baseURL", async () => {
      // createAutomation pins the request to the backend active when the
      // mutation started via buildPinnedLocalConfig. The interceptor must not
      // overwrite that baseURL with getEffectiveLocalBackend's current value.
      mockGetEffectiveLocal.mockReturnValue({
        ...localBackend,
        host: "http://should-not-use:9000",
        apiKey: "key",
      });
      localOfetch
        .mockResolvedValueOnce(mockAutomation)
        .mockResolvedValueOnce({ ...mockAutomation, enabled: false });

      const spec = {
        name: "Imported",
        prompt: "Do it",
        trigger: { type: "schedule", schedule_human: "Daily" } as const,
        enabled: true,
        repository: "acme/repo",
        model: "daily-profile",
      };

      await AutomationService.createAutomation(spec);

      const [, options] = localOfetch.mock.calls[0];
      expect(options?.baseURL).toBe("http://localhost:8000");
      expect(options?.headers).toMatchObject({
        "X-Session-API-Key": "session-key",
      });
    });
  });
});
