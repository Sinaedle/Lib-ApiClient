import type { AxiosInstance } from 'axios';
import type { LogFn } from '../types';

/**
 * Sets up a request logging interceptor
 *
 * - Logs outgoing requests in "{METHOD} {URL}" format
 * - Attaches a request start timestamp (_requestStartTime) for duration tracking
 */
export const setupRequestLogger = (instance: AxiosInstance, log: LogFn) => {
  instance.interceptors.request.use((config) => {
    config._requestStartTime = Date.now();
    log(`${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
};

/**
 * Sets up a response logging interceptor
 *
 * - Logs completed requests with duration in "{METHOD} {URL} ({duration}ms)" format
 * - Uses _requestStartTime from request interceptor to calculate elapsed time
 */
export const setupResponseLogger = (instance: AxiosInstance, log: LogFn) => {
  instance.interceptors.response.use((response) => {
    if (response.config._requestStartTime) {
      const duration = Date.now() - response.config._requestStartTime;
      log(`${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    }
    return response;
  });
};
