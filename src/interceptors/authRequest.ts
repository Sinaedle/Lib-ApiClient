import type { AxiosInstance } from 'axios';
import type { ApiClientAuthConfig } from '../types';

/**
 * Sets up an authentication request interceptor for private requests
 *
 * - Retrieves access token via getAccessToken (supports async)
 * - Injects Authorization header with Bearer token if available
 */
export const setupAuthRequestInterceptor = (
  instance: AxiosInstance,
  auth: ApiClientAuthConfig
) => {
  instance.interceptors.request.use(async (config) => {
    const accessToken = await auth.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });
};
