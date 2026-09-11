import axios from 'axios';

/** Axios error code assigned to canceled requests */
export const CANCELED_ERROR_CODE = 'ERR_CANCELED';

/**
 * Determines whether an error was produced by request cancellation
 * (AbortController.abort() or a CancelToken)
 *
 * A canceled request is not a failure. The caller abandoned or superseded it,
 * so it must not be retried, refreshed, or reported through onError.
 *
 * Accepts both raw AxiosError and normalized HttpError, since cancellation is
 * checked before and after normalization.
 */
export const isCanceledError = (error: unknown): boolean => {
  if (axios.isCancel(error)) return true;

  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === CANCELED_ERROR_CODE
  );
};
