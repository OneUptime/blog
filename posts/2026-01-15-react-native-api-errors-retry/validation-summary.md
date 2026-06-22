# Validation Summary: How to Handle API Errors and Retry Logic in React Native

## Status
validated

## Post Type
Tutorial / Guide (production-ready API error handling and retry patterns in React Native with TypeScript)

## Technologies Covered
- React Native
- TypeScript
- Axios (HTTP client, interceptors, cancellation)
- `@react-native-community/netinfo` (network connectivity detection)
- `@react-native-async-storage/async-storage` (offline queue persistence)
- AbortController / `fetch` signal cancellation
- HTTP status codes (4xx / 5xx semantics)
- Exponential backoff and jitter (full / equal / decorrelated)
- React error boundaries and hooks

## Sources Consulted
- Axios upgrade guide / interceptor typing — https://github.com/axios/axios/issues/5494 and https://github.com/axios/axios/blob/v1.x/README.md (request interceptors receive `InternalAxiosRequestConfig` in v1.x)
- AWS Architecture Blog, "Exponential Backoff And Jitter" — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ (decorrelated jitter = `min(cap, random_between(base, sleep*3))`)
- Axios cancellation docs (CancelToken deprecated since v0.22.0 in favor of AbortController) — https://axios-http.com/docs/cancellation
- NetInfo docs — https://github.com/react-native-netinfo/react-native-netinfo (`addEventListener`, `fetch`, `NetInfoState.isConnected`/`.type`)
- MDN AbortController / `AbortError` — https://developer.mozilla.org/en-US/docs/Web/API/AbortController

## Issues Found
1. **Request interceptor typed with `AxiosRequestConfig` (axios v1.x compile error).** In the request interceptor (`requestInterceptor.ts`), the callback parameter was typed `AxiosRequestConfig`. Since axios v1.0, `interceptors.request.use` passes an `InternalAxiosRequestConfig` (stricter `headers` typing), so the original code fails to compile under TypeScript. Fixed the parameter type to `InternalAxiosRequestConfig` and updated the import to bring in `AxiosInstance`, `InternalAxiosRequestConfig`, and `AxiosError` (the snippet already used all three but imported only `AxiosRequestConfig`).

2. **Decorrelated jitter implementation did not match its own comment / the AWS algorithm.** The code computed `Math.random() * baseDelay * 3`, which yields a value in `[0, 3×delay]`. The accompanying comment ("random between base and 3x previous delay") and the canonical AWS formula are `min(cap, random_between(base, prev*3))` — i.e., the lower bound must be `base`, not `0`. Corrected the implementation to `lower + Math.random() * (upper - lower)` with `lower = defaultRetryConfig.baseDelay` and `upper = baseDelay * 3` (wrapped the `case` in a block to scope the local consts).

## Review Notes
- **Custom `config.metadata` property:** Assigning `config.metadata = { startTime: ... }` and reading `response.config.metadata?.startTime` works at runtime but requires TypeScript module augmentation (`declare module 'axios' { interface InternalAxiosRequestConfig { metadata?: { startTime: Date } } }`) to type-check under strict mode. The post omits this declaration. Left as-is to avoid adding new content, but readers using strict TypeScript will need it. The same applies to the custom `_retry` flag on `originalRequest` in the response interceptor.
- **`axios.CancelToken` is deprecated** (since axios v0.22.0) in favor of `AbortController`. The post correctly presents `AbortController` as the "Modern Approach" immediately after, and `CancelToken` still functions in axios v1.x, so this is acceptable as a transitional example rather than an error.
- **`String.prototype.substr` is deprecated** (used in `generateRequestId`). It still works in all current JS engines; `slice(2, 11)` would be the modern equivalent. Cosmetic, left unchanged.
- **Error-type contract between layers:** `retryableRequest` throws an already-mapped `ApiError`, but `apiService.request` then passes the caught error to `globalErrorHandler.handleError`, which calls `handleHttpError` again (it expects a raw `AxiosError`). Re-mapping an `ApiError` would mislabel it as `NETWORK_ERROR` since it lacks a `.response` field. This is an architectural inconsistency in the assembled example rather than a syntax error; fixing it cleanly would require restructuring the error contract across several snippets, so it was left to the reader's judgment and noted here.
- HTTP status code tables, exponential backoff math (1s/2s/4s/8s for attempts 0–3), NetInfo usage, the `useApi` hook, and the error boundary are all technically accurate.
