import { AxiosError } from 'axios';
import { AxiosInstance } from 'axios';

/** Authentication and token refresh configuration for API client */
export declare interface ApiClientAuthConfig {
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

/** Base configuration shared by all API clients */
export declare interface ApiClientBaseConfig {
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

/** Top-level configuration for creating an API client */
export declare interface ApiClientConfig extends ApiClientBaseConfig {
    /** Authentication configuration. If provided, a privateClient will be created */
    auth?: ApiClientAuthConfig;
    /** Post-error handler invoked with normalized HttpError and request context */
    onError?: (error: HttpError, context: ErrorContext) => void | Promise<void>;
}

/** Axios client instances */
export declare interface ApiClientInstance {
    /** Client without authentication */
    publicClient: AxiosInstance;
    /** Client with authentication (null if auth config is not provided) */
    privateClient: AxiosInstance | null;
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
export declare const createApiClient: (config: ApiClientConfig) => ApiClientInstance;

/** Contextual metadata for the request when an error occurs */
export declare interface ErrorContext {
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

/**
 * Normalized HTTP error structure derived from AxiosError,
 * used for consistent error handling and logging
 */
export declare interface HttpError {
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

/** Request snapshot captured at the time of error (part of HttpError) */
export declare interface HttpErrorRequest {
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
export declare interface HttpErrorResponse {
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
 * Type guard to determine whether a caught error is an HttpError
 * and safely narrow its type
 */
export declare const isHttpError: (error: unknown) => error is HttpError;

/** Logger function for debug or error tracking */
export declare type LogFn = (message: string, data?: any) => void;

/**
 * Normalizes any thrown error into a unified HttpError structure
 *
 * Handles:
 * - AxiosError (HTTP request/response errors)
 * - Native Error (runtime, parsing, etc.)
 * - Unknown values (e.g., string throws)
 *
 * Built-in extractors cover common backend frameworks
 * (Spring Boot, NestJS, Django, FastAPI, ASP.NET, Laravel, Express, etc.)
 *
 * Ensures consistent error shape for downstream handling and logging
 */
export declare const normalizeError: (error: unknown) => HttpError;

/** Configuration for request retry behavior */
export declare interface RetryConfig {
    /** HTTP status codes that should trigger a retry */
    statusCodes: number[];
    /** Maximum number of retry attempts (excluding the initial request) */
    maxCount: number;
    /** Backoff strategy for retry delays (exponential or linear) */
    backoff?: 'exponential' | 'linear';
}

/** Token pair returned from authentication/refresh */
export declare interface TokenPair {
    /** Access token used for authenticated requests */
    accessToken: string;
    /** Optional refresh token */
    refreshToken?: string;
}

export { }


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
