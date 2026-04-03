## @nyang96/api-client

Axios 기반의 범용 HTTP 클라이언트 라이브러리.

- public / private 클라이언트 분리
- 토큰 자동 주입 / 리프레시 / 요청 큐잉
- 재시도 (exponential / linear backoff)
- 모든 에러를 `HttpError`로 정규화
- Content-Type 자동 처리 (JSON, FormData, Blob, URLSearchParams)
- 프레임워크 무관 (Vue, React, Vanilla 등)

---

## 설치

```bash
npm install git+https://github.com/Nyang96/api-client.git#v1.0.0
```

## 기본 사용법

```typescript
import { createApiClient } from '@nyang96/api-client';

const { publicClient, privateClient } = createApiClient({
  baseURL: 'https://api.example.com',

  auth: {
    getAccessToken: () => localStorage.getItem('accessToken'),
    getRefreshToken: () => localStorage.getItem('refreshToken'),

    refreshCondition: {
      statusCodes: [401],
    },

    refreshRequest: async (refreshToken, baseURL) => {
      const { data } = await publicClient.get(`${baseURL}/auth/refresh`, {
        headers: { 'X-Refresh-Token': `Bearer ${refreshToken}` },
      });
      return data.data; // { accessToken, refreshToken }
    },

    onTokenRefreshed: (tokens) => {
      localStorage.setItem('accessToken', tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
    },

    onAuthFailure: () => {
      localStorage.clear();
      window.location.href = '/login';
    },
  },

  retry: {
    statusCodes: [502, 503, 504],
    maxCount: 2,
    backoff: 'exponential',
  },

  debug: true,
});

// 인증 불필요한 요청
publicClient.post('/auth/login', credentials);

// 토큰 자동 주입
privateClient!.get('/api/users');
```

---

## 설정

### ApiClientConfig

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `baseURL` | `string` | *필수* | 모든 요청의 기본 URL |
| `timeout` | `number` | `0` | 요청 타임아웃 (ms). 0 = 무제한 |
| `defaultHeaders` | `Record<string, string>` | — | 모든 요청에 적용할 기본 헤더 |
| `withCredentials` | `boolean` | `false` | cross-site 요청 시 쿠키 포함 여부 |
| `retry` | `RetryConfig` | — | 재시도 설정 |
| `auth` | `ApiClientAuthConfig` | — | 인증 설정. 제공 시 privateClient 생성 |
| `onError` | `(error, context) => void` | — | 에러 발생 시 공통 후처리 (로깅 등) |
| `debug` | `boolean \| LogFn` | `false` | `true`: console.log, 함수: 커스텀 로거 |

### RetryConfig

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `statusCodes` | `number[]` | *필수* | 재시도 대상 HTTP 상태 코드 |
| `maxCount` | `number` | *필수* | 최대 재시도 횟수 (초기 요청 제외) |
| `backoff` | `'exponential' \| 'linear'` | `'exponential'` | 재시도 간격 전략 |

### ApiClientAuthConfig

| 필드 | 타입 | 설명 |
|---|---|---|
| `getAccessToken` | `() => string \| null \| Promise` | 현재 access token 반환 |
| `getRefreshToken` | `() => string \| null \| Promise` | 현재 refresh token 반환 |
| `refreshCondition` | `{ statusCodes?, messages? }` | 리프레시 트리거 조건 (기본 매칭) |
| `shouldRefresh` | `(error: AxiosError) => boolean` | 커스텀 리프레시 판단 로직. 제공 시 `refreshCondition` 무시 |
| `refreshRequest` | `(refreshToken, baseURL) => Promise<TokenPair>` | 토큰 갱신 요청 |
| `onTokenRefreshed` | `(tokens: TokenPair) => void` | 갱신 성공 후 토큰 저장 |
| `onAuthFailure` | `() => void` | 갱신 실패 시 처리 (로그아웃 등) |

---

## 에러 처리

모든 Axios 에러는 인터셉터에서 **`HttpError`**로 정규화된 후 reject됩니다. catch 블록에서는 raw `AxiosError`가 아닌 항상 `HttpError`를 받습니다.

### HttpError

```typescript
interface HttpError {
  status: number | null;        // HTTP 상태 코드 (응답 없으면 null)
  statusText: string;           // HTTP 상태 텍스트
  message: string;              // 서버 메시지 (빌트인 추출) 또는 에러 메시지
  code: string | null;          // 서버 에러 코드 → Axios 에러 코드 순 폴백
  url: string;                  // 요청 URL
  fullURL: string;              // baseURL + url + params 결합된 전체 URL
  method: string;               // HTTP 메서드 (대문자)
  request: HttpErrorRequest | null;   // 요청 스냅샷
  response: HttpErrorResponse | null; // 응답 스냅샷
  duration: number | null;      // 요청 소요 시간 (ms)
  timestamp: string;            // 에러 발생 시각 (ISO 8601)
  originalError: unknown;       // 원본 에러 객체
}
```

### 빌트인 메시지 추출

서버 응답에서 에러 메시지를 자동 추출합니다. 별도 설정 없이 주요 백엔드 프레임워크를 커버합니다:

| 프레임워크 | 추출 필드 |
|---|---|
| Spring Boot, Express, Laravel | `message`, `error`, `msg` |
| NestJS | `message` (string 또는 string[]) |
| Django, FastAPI (RFC 7807) | `detail` (string 또는 object[]) |
| ASP.NET (RFC 7807) | `title`, `detail` |
| 중첩 구조 | `error.message` |

에러 코드도 동일하게 `code`, `errorCode`, `error_code`, `statusCode`(NestJS), `type`(RFC 7807) 순으로 추출합니다.

### isHttpError

타입 가드로 catch 블록에서 안전하게 타입을 좁힐 수 있습니다:

```typescript
import { isHttpError } from '@nyang96/api-client';

try {
  await privateClient!.get('/api/resource');
} catch (error) {
  if (isHttpError(error)) {
    console.log(error.status);   // number | null
    console.log(error.message);  // string
  }
}
```

### 프로젝트 레벨 에러 변환 예시

라이브러리는 `HttpError`까지만 정규화하고, 프로젝트별 에러 형태 변환은 소비 측에서 처리합니다:

```typescript
import { isHttpError, type HttpError } from '@nyang96/api-client';

interface ApiErrorResponse {
  isSuccess: false;
  message: string;
  data: { code: string; status: string; statusCode: number; message: string };
  timestamp: string;
}

/**
 * HttpError → 프로젝트 에러 형태로 변환
 * - 서버 커스텀 응답이면 그대로 반환
 * - 프레임워크/네트워크 에러면 HttpError에서 매핑
 */
export function toApiErrorResponse(error: unknown): ApiErrorResponse {
  if (isHttpError(error)) {
    // 서버 커스텀 응답 우선
    const data = error.response?.data as any;
    if (typeof data?.isSuccess === 'boolean') {
      return data as ApiErrorResponse;
    }

    // 프레임워크/네트워크 에러 → 매핑
    return {
      isSuccess: false,
      message: error.message || '알 수 없는 오류입니다.',
      data: {
        code: error.code ?? '000',
        status: error.statusText || 'UNKNOWN',
        statusCode: error.status ?? 999,
        message: error.message || 'UNKNOWN ERROR',
      },
      timestamp: error.timestamp,
    };
  }

  return getUnknownErrorResponse();
}
```

---

## onError (공통 에러 후처리)

모든 에러 발생 시 호출되는 글로벌 콜백입니다. 에러 로깅, 모니터링 전송 등에 활용합니다:

```typescript
createApiClient({
  baseURL: 'https://api.example.com',
  onError: (error, context) => {
    // context: { url, method, status, duration, retryCount, clientType }
    logger.error(`[${context.clientType}] ${context.method} ${context.url}`, {
      status: error.status,
      message: error.message,
      duration: context.duration,
    });
  },
});
```

`onError`는 에러를 가로채지 않습니다. 콜백 실행 후 `HttpError`는 그대로 reject되어 호출 측 catch 블록에 전달됩니다.

---

## 토큰 리프레시 흐름

```
요청 실패 (401)
  │
  ├─ 이미 리프레시 중? → 큐에 대기
  │
  └─ 리프레시 시작 (락 획득)
       │
       ├─ 성공 → onTokenRefreshed → 대기 요청 재시도 → 원본 요청 재시도
       │
       └─ 실패 → 대기 요청 전부 reject → onAuthFailure
```

동시에 여러 요청이 401을 받아도 리프레시는 **한 번만** 실행됩니다. 나머지 요청은 큐에 쌓였다가 새 토큰으로 자동 재시도됩니다.

---

## 인터셉터 파이프라인

요청/응답이 인터셉터를 거치는 순서입니다:

**publicClient:**

```
[Request]  로깅 → Content-Type
[Response] 로깅 → 재시도 → 에러 정규화
```

**privateClient:**

```
[Request]  로깅 → Content-Type → 토큰 주입
[Response] 로깅 → 토큰 리프레시 → 재시도 → 에러 정규화
```

에러 정규화 인터셉터가 항상 마지막에 위치하므로, catch 블록에서는 `HttpError`만 받게 됩니다.

---

## Content-Type 자동 처리

요청 데이터 타입에 따라 Content-Type이 자동으로 설정됩니다:

| 데이터 타입 | Content-Type |
|---|---|
| `FormData` | 자동 (브라우저가 boundary 포함하여 설정) |
| `Blob` | 자동 (브라우저/어댑터가 추론) |
| `URLSearchParams` | `application/x-www-form-urlencoded` |
| 그 외 | `application/json` (기본값) |

```typescript
// FormData → Content-Type 자동 처리
const form = new FormData();
form.append('file', file);
privateClient!.post('/upload', form);

// JSON → 기본 application/json
privateClient!.post('/api/users', { name: 'John' });
```

커스텀 Content-Type도 지정 가능합니다. 인터셉터는 `FormData`, `Blob`, `URLSearchParams`일 때만 개입하고, 그 외에는 기존 헤더를 유지합니다:

```typescript
// 요청별 커스텀
privateClient!.post('/api/xml', xmlPayload, {
  headers: { 'Content-Type': 'application/xml' },
});

// 전역 기본값 변경
createApiClient({
  baseURL: '...',
  defaultHeaders: {
    'Content-Type': 'text/plain',
  },
});
```

> **주의:** `FormData`나 `Blob`을 보내면 직접 지정한 Content-Type도 인터셉터가 삭제합니다. 브라우저가 boundary를 자동 설정해야 하기 때문에 의도된 동작입니다.

---

## 디버그 로깅

```typescript
// console.log 사용
createApiClient({ baseURL: '...', debug: true });

// 커스텀 로거
createApiClient({
  baseURL: '...',
  debug: (message, data) => myLogger.info(message, data),
});
```

로그 포맷:

```
GET /api/users                          ← 요청
GET /api/users (142ms)                  ← 응답
Retry 1/3 after 1000ms                  ← 재시도
Token refreshed, retrying request       ← 리프레시 성공
Token refresh failed                    ← 리프레시 실패
```

---

## Exports

```typescript
// 함수
export { createApiClient }    // 클라이언트 팩토리
export { normalizeError }     // 에러 정규화 (단독 사용 가능)
export { isHttpError }        // HttpError 타입 가드

// 타입
export type {
  ApiClientConfig,
  ApiClientBaseConfig,
  ApiClientAuthConfig,
  ApiClientInstance,
  TokenPair,
  RetryConfig,
  LogFn,
  ErrorContext,
  HttpError,
  HttpErrorRequest,
  HttpErrorResponse,
}
```