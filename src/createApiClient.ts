import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { ApiClientConfig, ApiClientInstance } from './types';
import { resolveLogger } from './utils/resolveLogger';
import { setupRequestLogger, setupResponseLogger } from './interceptors/logger';
import { setupAuthRequestInterceptor } from './interceptors/authRequest';
import { setupRefreshInterceptor } from './interceptors/refresh';
import { setupRetryInterceptor } from './interceptors/retry';
import { setupErrorInterceptor } from './interceptors/errorHandler';
import { setupContentTypeInterceptor } from './interceptors/contentType';

/**
 * Extends Axios request config with internal fields used for
 * retry control and logging
 *
 * - _alreadyRetried: prevents infinite retry loops
 * - _retryCount: tracks the number of retry attempts
 * - _requestStartTime: used to calculate request duration
 */
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _alreadyRetried?: boolean;
    _retryCount?: number;
    _requestStartTime?: number;
  }
}

/**
 * Creates configured Axios clients (public and optional private)
 *
 * - Initializes base Axios instances
 * - Attaches interceptors for logging, retry, error handling, etc.
 * - Conditionally creates a private client when auth config is provided
 *
 * Client composition:
 * - publicClient: logging → content-type → response → retry → error
 * - privateClient: logging → content-type → auth → response → refresh → retry → error
 */
export const createApiClient = (config: ApiClientConfig): ApiClientInstance => {
  const log = resolveLogger(config.debug);

  // ── Public client (no authentication) ──
  const publicClient = createBaseInstance(config);
  setupRequestLogger(publicClient, log);
  setupContentTypeInterceptor(publicClient);
  setupResponseLogger(publicClient, log);
  if (config.retry) {
    setupRetryInterceptor(publicClient, config.retry, log);
  }
  setupErrorInterceptor(publicClient, config, 'public');

  // ── Private client (requires auth configuration) ──
  let privateClient: AxiosInstance | null = null;
  if (config.auth) {
    privateClient = createBaseInstance(config);
    setupRequestLogger(privateClient, log);
    setupContentTypeInterceptor(privateClient);
    setupAuthRequestInterceptor(privateClient, config.auth);
    setupResponseLogger(privateClient, log);
    setupRefreshInterceptor(privateClient, config, log);
    if (config.retry) {
      setupRetryInterceptor(privateClient, config.retry, log);
    }
    setupErrorInterceptor(privateClient, config, 'private');
  }

  return { publicClient, privateClient };
};

/**
 * Creates a base Axios instance with default configuration
 *
 * - Applies baseURL, timeout, credentials, and default headers
 * - Sets default Content-Type to application/json
 */
const createBaseInstance = (config: ApiClientConfig): AxiosInstance => {
  return axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 0,
    withCredentials: config.withCredentials ?? false,
    headers: {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    },
  });
};
