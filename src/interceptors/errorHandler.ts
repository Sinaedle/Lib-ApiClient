import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiClientConfig, ErrorContext } from '../types';
import { normalizeError } from '../utils/normalizeError';

/**
 * Sets up an error handling interceptor that normalizes errors into HttpError
 *
 * - Normalizes any thrown error into HttpError
 * - Builds an ErrorContext with request/response metadata
 * - Invokes the onError callback (if provided) with the normalized error
 * - Always rejects with HttpError instead of raw AxiosError
 */
export const setupErrorInterceptor = (
  instance: AxiosInstance,
  config: ApiClientConfig,
  clientType: 'public' | 'private'
) => {
  instance.interceptors.response.use(null, async (error: unknown) => {
    // Normalize any error into HttpError
    const httpError = normalizeError(error);

    // Build ErrorContext from normalized error and request config
    const context: ErrorContext = {
      url: httpError.url || undefined,
      method: httpError.method || undefined,
      status: httpError.status ?? undefined,
      duration: httpError.duration,
      // Extract retry count from Axios config (if available)
      retryCount: (() => {
        if (error && typeof error === 'object' && 'config' in error) {
          const req = (error as any).config as InternalAxiosRequestConfig;
          return req?._retryCount ?? 0;
        }
        return 0;
      })(),
      clientType,
    };

    // Invoke onError callback with normalized error and context (if defined)
    if (config.onError) {
      await config.onError(httpError, context);
    }

    // Propagate normalized HttpError
    return Promise.reject(httpError);
  });
};