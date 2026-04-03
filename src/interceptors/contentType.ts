import type { AxiosInstance } from 'axios';

/**
 * Sets up a Content-Type handling interceptor
 *
 * - FormData: removes Content-Type (browser automatically sets multipart boundary)
 * - Blob: removes Content-Type (allows browser/adapter to infer it)
 * - URLSearchParams: sets Content-Type to application/x-www-form-urlencoded
 * - Others: keeps default Content-Type (typically application/json)
 */
export const setupContentTypeInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.request.use((config) => {
    const data = config.data;

    // Let the browser set Content-Type with proper boundary
    if (data instanceof FormData || data instanceof Blob) {
      config.headers.delete('Content-Type');
    } else if (data instanceof URLSearchParams) {
      config.headers.set('Content-Type', 'application/x-www-form-urlencoded');
    }

    return config;
  });
};