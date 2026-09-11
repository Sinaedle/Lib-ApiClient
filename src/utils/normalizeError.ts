import axios, { type AxiosError } from 'axios';
import type { HttpError, HttpErrorRequest, HttpErrorResponse } from '../types';
import { isCanceledError } from './isCanceledError';
import {
  type ErrorFieldExtractors,
  resolveErrorCode,
  resolveErrorMessage,
} from './serverErrorFields';

/**
 * Returns a human-readable error message
 * - Prioritizes server-provided message when available
 * - Falls back to an empty string
 */
function buildMessage(serverMessage?: string): string {
  return serverMessage ? serverMessage : '';
}

/**
 * Builds a full request URL from baseURL, url, and query params
 *
 * - Resolves relative URL against baseURL
 * - Serializes query parameters using URLSearchParams
 * - Supports array values as repeated query keys
 * - Falls back to raw url if URL construction fails
 */
function buildFullURL(
  baseURL?: string,
  url?: string,
  params?: Record<string, unknown>
): string {
  try {
    const full = new URL(url ?? '', baseURL);

    if (params) {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        // Handle array values
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      });

      full.search = searchParams.toString();
    }

    return full.toString();
  } catch {
    return url ?? '';
  }
}

/**
 * Creates a normalized snapshot of the request from AxiosError
 *
 * - Extracts key request fields for debugging/logging
 * - Includes resolved full URL
 * - Safely handles missing config
 */
function buildRequestSnapshot(error: AxiosError): HttpErrorRequest | null {
  const config = error.config;
  if (!config) return null;

  const fullURL = buildFullURL(config.baseURL, config.url);

  return {
    url: config.url ?? '',
    method: (config.method ?? '').toUpperCase(),
    headers: flattenHeaders(config.headers),
    params: (config.params as Record<string, unknown>) ?? null,
    data: config.data ?? null,
    timeout: config.timeout ?? null,
    baseURL: config.baseURL ?? '',
    fullURL
  };
}

/**
 * Creates a normalized snapshot of the response from AxiosError
 *
 * - Preserves status, statusText, headers, and response body
 * - Returns null if no response is available
 */
function buildResponseSnapshot(error: AxiosError): HttpErrorResponse | null {
  const res = error.response;
  if (!res) return null;

  return {
    status: res.status,
    statusText: res.statusText ?? '',
    headers: flattenHeaders(res.headers),
    data: res.data ?? null,
  };
}

/**
 * Converts AxiosHeaders or header-like objects into a plain Record<string, string>
 *
 * - Uses toJSON() if available (AxiosHeaders)
 * - Falls back to manual key-value mapping
 * - Ensures all values are stringified
 */
function flattenHeaders(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== 'object') return {};

  // If AxiosHeaders.toJSON() is available, it will be used.
  // Otherwise, falls back to manual conversion.
  if (typeof (headers as any).toJSON === 'function') {
    const json = (headers as any).toJSON() as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([k, v]) => [k, String(v)])
    );
  }

  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>).map(([k, v]) => [k, String(v)])
  );
}

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
 * and can be overridden per client via ErrorFieldExtractors.
 *
 * Ensures consistent error shape for downstream handling and logging
 */
export const normalizeError = (
  error: unknown,
  extractors?: ErrorFieldExtractors
): HttpError => {
  const timestamp = new Date().toISOString();

  // Axios error (all HTTP-related errors)
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const data = error.response?.data;

    return {
      status,
      statusText: error.response?.statusText ?? '',
      message: buildMessage(resolveErrorMessage(data, extractors)),
      code: resolveErrorCode(data, extractors) ?? error.code ?? null,
      isCanceled: isCanceledError(error),
      url: error.config?.url ?? '',
      fullURL: buildRequestSnapshot(error)?.fullURL ?? '',
      method: (error.config?.method ?? '').toUpperCase(),
      request: buildRequestSnapshot(error),
      response: buildResponseSnapshot(error),
      duration: error.config?._requestStartTime
        ? Date.now() - error.config._requestStartTime
        : null,
      timestamp,
      originalError: error,
    };
  }

  // Native Error (runtime errors, JSON parsing failures, etc.)
  if (error instanceof Error) {
    const isParse = error instanceof SyntaxError || error.message.includes('JSON');

    return {
      status: null,
      statusText: '',
      message: isParse ? '서버 응답을 처리할 수 없습니다.' : error.message,
      code: error.name,
      isCanceled: isCanceledError(error),
      url: '',
      fullURL: '',
      method: '',
      request: null,
      response: null,
      duration: null,
      timestamp,
      originalError: error,
    };
  }

  // Non-standard errors (e.g., string throws)
  return {
    status: null,
    statusText: '',
    message: typeof error === 'string' ? error : '알 수 없는 오류가 발생했습니다.',
    code: null,
    isCanceled: false,
    url: '',
    fullURL: '',
    method: '',
    request: null,
    response: null,
    duration: null,
    timestamp,
    originalError: error,
  };
};

/**
 * Type guard to determine whether a caught error is an HttpError
 * and safely narrow its type
 */
export const isHttpError = (error: unknown): error is HttpError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'timestamp' in error &&
    'originalError' in error &&
    'status' in error &&
    'message' in error
  );
};