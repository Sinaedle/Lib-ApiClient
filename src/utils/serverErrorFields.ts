/**
 * Extracts a human-readable message from server response data (built-in).
 *
 * Covers common backend framework error formats:
 * - General:      { message }, { error }, { msg }
 * - Spring Boot:  { message, error }
 * - NestJS:       { message: string | string[] }
 * - Django / FastAPI (RFC 7807): { detail: string | object[] }
 * - ASP.NET (RFC 7807): { title, detail }
 * - Laravel:      { message, errors: { field: [...] } }
 * - Nested:       { error: { message } }
 *
 * Exploration order is intentional — more specific fields first,
 * broader fallbacks last.
 */
export function extractServerMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  // ── Direct message fields (most common) ──
  if (typeof d.message === 'string') return d.message;

  // NestJS: message can be string[] for validation errors
  if (Array.isArray(d.message) && d.message.length > 0) {
    return d.message.filter((m): m is string => typeof m === 'string').join(', ');
  }

  // ── RFC 7807 / ASP.NET / FastAPI ──
  // detail takes priority over title (detail is more specific)
  if (typeof d.detail === 'string') return d.detail;
  if (typeof d.title === 'string') return d.title;

  // FastAPI: detail can be an array of validation error objects
  if (Array.isArray(d.detail) && d.detail.length > 0) {
    return d.detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (typeof item?.msg === 'string') return item.msg;
        return null;
      })
      .filter(Boolean)
      .join(', ');
  }

  // ── Shorthand fields ──
  if (typeof d.error === 'string') return d.error;
  if (typeof d.msg === 'string') return d.msg;

  // ── Nested error object (Express / custom wrappers) ──
  if (d.error && typeof d.error === 'object') {
    const nested = d.error as Record<string, unknown>;
    if (typeof nested.message === 'string') return nested.message;
  }

  return undefined;
}

/**
 * Extracts an error code from server response data (built-in).
 *
 * Covers common field variations across frameworks:
 * - code, errorCode, error_code (general)
 * - statusCode (NestJS)
 * - type (RFC 7807 / ASP.NET)
 */
export function extractServerCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  // ── Direct code fields ──
  if (typeof d.code === 'string') return d.code;
  if (typeof d.code === 'number') return String(d.code);
  if (typeof d.errorCode === 'string') return d.errorCode;
  if (typeof d.error_code === 'string') return d.error_code;

  // ── NestJS statusCode (number → string) ──
  if (typeof d.statusCode === 'number') return String(d.statusCode);

  // ── RFC 7807 type URI ──
  if (typeof d.type === 'string') return d.type;

  return null;
}

/**
 * Overrides for locating error fields in a server response.
 *
 * The built-in extractors cover common framework shapes, but a backend may put
 * its error code somewhere they do not look (e.g. inside a response envelope).
 * Supplying an extractor teaches the client where to look, so the code lands in
 * HttpError.code and becomes usable for refresh conditions and consumer logic.
 */
export interface ErrorFieldExtractors {
  /** Locates the server error code. Falls back to built-in extraction when it returns null */
  extractErrorCode?: (data: unknown) => string | null;
  /** Locates the server error message. Falls back to built-in extraction when it returns undefined */
  extractErrorMessage?: (data: unknown) => string | undefined;
}

/** Resolves the error code, preferring a caller-supplied extractor */
export function resolveErrorCode(
  data: unknown,
  extractors?: ErrorFieldExtractors
): string | null {
  return extractors?.extractErrorCode?.(data) ?? extractServerCode(data);
}

/** Resolves the error message, preferring a caller-supplied extractor */
export function resolveErrorMessage(
  data: unknown,
  extractors?: ErrorFieldExtractors
): string | undefined {
  return extractors?.extractErrorMessage?.(data) ?? extractServerMessage(data);
}
