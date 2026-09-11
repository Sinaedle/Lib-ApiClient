export { createApiClient } from './createApiClient';
export { normalizeError, isHttpError } from './utils/normalizeError';
export { isCanceledError, CANCELED_ERROR_CODE } from './utils/isCanceledError';
export { extractServerCode, extractServerMessage } from './utils/serverErrorFields';
export type { ErrorFieldExtractors } from './utils/serverErrorFields';

export type {
  // Client
  ApiClientConfig,
  ApiClientBaseConfig,
  ApiClientAuthConfig,
  ApiClientInstance,
  TokenPair,
  RetryConfig,
  LogFn,

  // Error
  ErrorContext,
  HttpError,
  HttpErrorRequest,
  HttpErrorResponse,
} from './types';