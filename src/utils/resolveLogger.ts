import type { LogFn } from '../types';

/**
 * Resolves the debug option into a LogFn used for internal logging (request/response/retry/refresh)
 * - false/undefined → no-op logger
 * - true → console.log-based logger
 * - function → custom logger
 *
 * Log format when debug is set to true:
 * - Request: "{METHOD} {URL}"
 * - Response: "{METHOD} {URL} ({duration}ms)"
 * - Retry: "Retry {current}/{max} after {delay}ms"
 * - Refresh (success): "Token refreshed, retrying request"
 * - Refresh (failure): "Token refresh failed"
 */
export const resolveLogger = (debug?: boolean | LogFn): LogFn => {
  if (!debug) return () => {};
  if (typeof debug === 'function') return debug;
  return (message: string, data?: any) => {
    data ? console.log(message, data) : console.log(message);
  };
};
