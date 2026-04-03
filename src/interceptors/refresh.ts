import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiClientConfig, LogFn } from '../types';

/**
 * Sets up a token refresh interceptor for handling expired authentication
 *
 * Flow:
 * 1. If a response matches the refresh condition, initiate token refresh
 * 2. While refresh is in progress, incoming requests are queued
 * 3. On success:
 *    - Update tokens via onTokenRefreshed
 *    - Resolve all queued requests with the new access token
 *    - Retry the original request
 * 4. On failure:
 *    - Reject all queued requests
 *    - Invoke onAuthFailure
 *
 * Notes:
 * - Prevents multiple concurrent refresh requests using a shared lock (isRefreshing)
 * - Ensures a single refresh request with request queueing (pendingQueue)
 * - Skips retry for canceled or already retried requests
 */
export const setupRefreshInterceptor = (
  instance: AxiosInstance,
  config: ApiClientConfig,
  log: LogFn
) => {
  const auth = config.auth!;

  let isRefreshing = false;
  let pendingQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  const processQueue = (error: any = null, token: string | null = null) => {
    pendingQueue.forEach(({ resolve, reject }) => {
      error ? reject(error) : resolve(token!);
    });
    pendingQueue = [];
  };

  // Determine whether the request should trigger token refresh
  const shouldRefresh = auth.shouldRefresh ?? ((error: AxiosError) => {
    const status = error.response?.status;
    const message = (error.response?.data as any)?.message;

    const codes = auth.refreshCondition?.statusCodes ?? [];
    const messages = auth.refreshCondition?.messages ?? [];

    return (
      (status != null && codes.includes(status)) ||
      (message != null && messages.includes(message))
    );
  });

  // Response error interceptor (handles token expiration)
  instance.interceptors.response.use(null, async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;

    // Ignore canceled requests
    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    // Skip if not eligible for refresh or already retried
    if (
      !shouldRefresh(error) ||
      originalRequest?._alreadyRetried ||
      !originalRequest
    ) {
      return Promise.reject(error);
    }

    // If refresh is already in progress, queue the request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(instance(originalRequest));
          },
          reject,
        });
      });
    }

    // Mark request as retried and acquire refresh lock
    originalRequest._alreadyRetried = true;
    isRefreshing = true;

    try {
      // Retrieve refresh token
      const refreshTokenValue = await auth.getRefreshToken();
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      // Perform token refresh request
      const tokens = await auth.refreshRequest(refreshTokenValue, config.baseURL);
      // Update application state with new tokens
      await auth.onTokenRefreshed(tokens);

      // Resolve queued requests and retry original request
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      processQueue(null, tokens.accessToken);

      log('Token refreshed, retrying request');
      return instance(originalRequest);
    } catch (refreshError) {
      // Reject all queued requests and trigger auth failure handler
      processQueue(refreshError, null);
      log('Token refresh failed');
      await auth.onAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      // Release refresh lock
      isRefreshing = false;
    }
  });
};
