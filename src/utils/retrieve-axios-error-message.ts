import {
  isAxiosError,
  isAxiosErrorWithErrorField,
  isAxiosErrorWithMessageField,
} from "./axios-error";
import { getUserFacingConnectionErrorMessage } from "./user-facing-error";

/**
 * Retrieve the error message from an axios-compatible HTTP error.
 * @param error The error to render a toast for
 */
export const retrieveAxiosErrorMessage = (error: unknown): string => {
  let errorMessage: string | null = null;
  let shouldPreferExtractedMessage = false;

  if (isAxiosError(error)) {
    shouldPreferExtractedMessage = true;
    if (isAxiosErrorWithErrorField(error)) {
      const errorField = error.response?.data?.error;
      if (typeof errorField === "string") {
        errorMessage = errorField;
      }
    } else if (isAxiosErrorWithMessageField(error)) {
      const messageField = error.response?.data?.message;
      if (typeof messageField === "string") {
        errorMessage = messageField;
      }
    }

    if (errorMessage === null) {
      errorMessage = error.message;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else {
    errorMessage = null;
  }

  const userFacingMessage = getUserFacingConnectionErrorMessage(
    shouldPreferExtractedMessage ? (errorMessage ?? error) : error,
  );
  return userFacingMessage ?? errorMessage ?? "";
};
