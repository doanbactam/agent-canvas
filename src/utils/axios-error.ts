/**
 * Minimal Axios-compatible error shape used by the app.
 *
 * The real `axios` package is no longer a direct dependency, but several
 * code paths (local agent-server calls, old automation code) still produce
 * errors with `response.data` / `response.status`. Keeping the same
 * interface lets us drop the `axios` import without rewriting every type.
 */
export interface AxiosErrorResponse<T = unknown> {
  data?: T;
  status?: number;
  statusText?: string;
  headers?: Record<string, unknown>;
}

export interface AxiosError<T = unknown> extends Error {
  response?: AxiosErrorResponse<T>;
  /** Legacy marker set by axios-shaped errors. */
  isAxiosError?: true;
  /** Some fetch/http clients expose status directly on the error. */
  status?: number;
}

export function isAxiosError(error: unknown): error is AxiosError {
  if (typeof error !== "object" || error === null) return false;

  // HttpError from the shared TypeScript client also carries a `response`
  // property, but its body lives directly on `response`, not under
  // `response.data`. Exclude it here so callers fall through to the HttpError
  // branch instead of treating it as axios-shaped.
  if ((error as { name?: unknown }).name === "HttpError") return false;

  return (
    (error as { isAxiosError?: unknown }).isAxiosError === true ||
    "response" in error ||
    "status" in error
  );
}

export function isAxiosErrorWithErrorField(
  error: AxiosError,
): error is AxiosError<{ error: string }> {
  return (
    typeof error.response?.data === "object" &&
    error.response.data !== null &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string"
  );
}

export function isAxiosErrorWithMessageField(
  error: AxiosError,
): error is AxiosError<{ message: string }> {
  return (
    typeof error.response?.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  );
}
