import type { AxiosError } from 'axios';

// ─────────────────────────────────────────────
// Client Configuration
// ─────────────────────────────────────────────

/** Base configuration shared by all API clients */
export interface ApiClientBaseConfig {
  /** Base URL for all requests */
  baseURL: string;
  /** Request timeout in milliseconds (default: 0 = no timeout) */
  timeout?: number;
  /** Default headers applied to all requests */
  defaultHeaders?: Record<string, string>;
  /** Whether to include credentials (cookies, authorization headers) in cross-site requests */
  withCredentials?: boolean;
  /** Retry configuration for failed requests (applies to both public and private clients) */
  retry?: RetryConfig;
  /** Debug logging (true = console.log, function = custom logger) */
  debug?: boolean | LogFn;
}

/** Configuration for request retry behavior */
export interface RetryConfig {
  /** HTTP status codes that should trigger a retry */
  statusCodes: number[];
  /** Maximum number of retry attempts (excluding the initial request) */
  maxCount: number;
  /** Backoff strategy for retry delays (exponential or linear) */
  backoff?: 'exponential' | 'linear';
}

/** Authentication and token refresh configuration for API client */
export interface ApiClientAuthConfig {
  /** Returns the current access token */
  getAccessToken: () => string | null | Promise<string | null>;
  /** Returns the current refresh token */
  getRefreshToken: () => string | null | Promise<string | null>;

  /**
   * Default conditions to trigger token refresh.
   * Used only when shouldRefresh is not provided.
   */
  refreshCondition?: {
    /** HTTP status codes that should trigger token refresh */
    statusCodes?: number[];
    /** Response error messages that should trigger token refresh */
    messages?: string[];
  };
  /**
   * Custom override logic for token refresh decision.
   * If provided, refreshCondition will be ignored.
   */
  shouldRefresh?: (error: AxiosError) => boolean;

  /** Function to request new tokens using the refresh token */
  refreshRequest: (refreshToken: string, baseURL: string) => Promise<TokenPair>;
  /** Callback invoked after successful token refresh */
  onTokenRefreshed: (tokens: TokenPair) => void | Promise<void>;
  /** Callback invoked when token refresh fails */
  onAuthFailure: () => void | Promise<void>;
}

/** Top-level configuration for creating an API client */
export interface ApiClientConfig extends ApiClientBaseConfig {
  /** Authentication configuration. If provided, a privateClient will be created */
  auth?: ApiClientAuthConfig;
  /** Post-error handler invoked with normalized HttpError and request context */
  onError?: (error: HttpError, context: ErrorContext) => void | Promise<void>;
}

/** Axios client instances */
export interface ApiClientInstance {
  /** Client without authentication */
  publicClient: import('axios').AxiosInstance;
  /** Client with authentication (null if auth config is not provided) */
  privateClient: import('axios').AxiosInstance | null;
}

/** Token pair returned from authentication/refresh */
export interface TokenPair {
  /** Access token used for authenticated requests */
  accessToken: string;
  /** Optional refresh token */
  refreshToken?: string;
}

// ─────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────

/** Contextual metadata for the request when an error occurs */
export interface ErrorContext {
  /** Request URL (for quick reference) */
  url?: string;
  /** HTTP request method */
  method?: string;
  /** HTTP status code */
  status?: number;
  /** Request duration in milliseconds */
  duration?: number | null;
  /** Number of retry attempts made for the request */
  retryCount?: number;
  /** Indicates whether the request was made via public or private client */
  clientType: 'public' | 'private';
}

/** Logger function for debug or error tracking */
export type LogFn = (message: string, data?: any) => void;

/** Request snapshot captured at the time of error (part of HttpError) */
export interface HttpErrorRequest {
  /** Request URL (relative or absolute) */
  url: string;
  /** HTTP request method (normalized to uppercase) */
  method: string;
  /** Request headers (AxiosHeaders flattened to Record<string, string>) */
  headers: Record<string, string>;
  /** Query string parameters */
  params: Record<string, unknown> | null;
  /** Request payload (body) */
  data: unknown;
  /** Request timeout in milliseconds (0 = no timeout) */
  timeout: number | null;
  /** Base URL used as prefix for the request */
  baseURL: string;
  /** Final resolved request URL */
  fullURL: string;
}

/** Response snapshot captured at the time of error (part of HttpError) */
export interface HttpErrorResponse {
  /** HTTP status code */
  status: number;
  /** HTTP status text from the response */
  statusText: string;
  /** Response headers (AxiosHeaders flattened to Record<string, string>) */
  headers: Record<string, string>;
  /** Original response body */
  data: unknown;
}

/**
 * Normalized HTTP error structure derived from AxiosError,
 * used for consistent error handling and logging
 */
export interface HttpError {
  /** HTTP status code */
  status: number | null;
  /** HTTP status text from the response */
  statusText: string;
  /** Human-readable message (server message takes priority) */
  message: string;
  /** Server-defined error code or Axios error code */
  code: string | null;
  /** Request URL (for quick access) */
  url: string;
  /** Final resolved request URL (for quick access) */
  fullURL: string;
  /** HTTP request method */
  method: string;
  /** Request snapshot */
  request: HttpErrorRequest | null;
  /** Response snapshot */
  response: HttpErrorResponse | null;
  /** Request duration in milliseconds */
  duration: number | null;
  /** Error timestamp (ISO 8601) */
  timestamp: string;
  /** Original error object (unprocessed) */
  originalError: unknown;
}