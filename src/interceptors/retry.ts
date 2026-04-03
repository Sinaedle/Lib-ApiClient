import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import type { RetryConfig, LogFn } from '../types';

/**
 * Sets up a retry interceptor for failed requests
 *
 * - Supports exponential or linear backoff strategies
 * - Retries requests based on configured conditions
 */
export const setupRetryInterceptor = (
  instance: AxiosInstance,
  retry: RetryConfig,
  log: LogFn
) => {
  const { statusCodes, maxCount, backoff = 'exponential' } = retry;

  instance.interceptors.response.use(null, async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;
    const status = error.response?.status ?? 0;
    const currentCount = originalRequest?._retryCount ?? 0;

    if (
      statusCodes.includes(status) &&
      currentCount < maxCount &&
      originalRequest
    ) {
      originalRequest._retryCount = currentCount + 1;

      const delay = backoff === 'exponential'
        ? Math.pow(2, currentCount) * 1000
        : 1000;

      log(`Retry ${currentCount + 1}/${maxCount} after ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));

      return instance(originalRequest);
    }

    return Promise.reject(error);
  });
};
