# Validation Summary: How to Implement Retry Logic with Exponential Backoff in React

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- React
- TypeScript
- Fetch API
- Exponential backoff and jitter
- Retry conditions, circuit breakers, rate limiting, and timeouts
- React Testing Library
- Mock Service Worker

## Sources Consulted
- MDN Web Docs: Window fetch API, including HTTP error handling behavior. https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
- MDN Web Docs: Using the Fetch API and checking response status. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN Web Docs: Window setTimeout API. https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
- React docs: useEffect reference and dependency behavior. https://react.dev/reference/react/useEffect
- React docs: useCallback reference. https://react.dev/reference/react/useCallback
- TypeScript Handbook: Utility Types, including ReturnType. https://www.typescriptlang.org/docs/handbook/utility-types.html
- Mock Service Worker docs: 1.x to 2.x migration and current http/HttpResponse API. https://mswjs.io/docs/migrations/1.x-to-2.x/

## Issues Found
- The exponential backoff formula was inconsistent with the 1-indexed attempt examples. Changed it from `baseDelay * (2 ^ attemptNumber)` to `baseDelay * (2 ^ (attemptNumber - 1))`.
- The basic `fetchUserData` example retried only the `fetch()` call, but `fetch()` does not reject for HTTP 4xx/5xx responses. Moved the `response.ok` check inside the retried function so HTTP failures can be retried.
- The `useRetry` hook continued the loop even when `retryCondition` returned `false`, causing immediate extra attempts for non-retryable errors. Added a break path and corrected the final attempt count.
- The hook examples used `NodeJS.Timeout` in browser React code. Replaced it with `ReturnType<typeof setTimeout>` for portable TypeScript typing.
- Clearing retry timeouts left pending promises unresolved. Added cancellable delay helpers so cancellation and cleanup resolve the awaiting retry delay.
- The `UserProfile` example passed inline fetch and retry callbacks into the hook, making `execute` unstable and causing the effect to rerun unnecessarily. Wrapped the fetcher and callbacks in `useCallback`.
- The `UserProfile` retry condition inferred retryability by searching for `"5"` in the error message. Changed it to preserve HTTP status on the thrown error and retry network errors or 5xx responses explicitly.
- The advanced query hook depended on `data` inside `fetchWithRetry`, causing the effect to recreate and rerun after successful fetches. Moved freshness tracking to a ref.
- The advanced query hook treated falsy data as missing in the freshness check. Changed the check to `dataRef.current !== undefined`.
- The advanced query hook checked `abortControllerRef.current` inside the retry loop, which could point at a newer request if another fetch started. Changed the loop to check the local `AbortController` for the current execution.
- The `RetryServiceOptions` type was used across snippets but was not exported/imported. Exported it from the service snippet and imported it in the context provider snippet.
- The dashboard example retried `response.json()` without checking `response.ok`, so HTTP failures would not be retried. Added an HTTP status check inside the retried operation.
- The dashboard example used untyped `useState(null)` for data and error state and set an `unknown` caught error into a `null` state. Added appropriate `unknown` and `Error | null` state types and cast the caught error.
- The dashboard effect used a locally declared async function with an empty dependency array. Wrapped the function in `React.useCallback` and added the correct effect dependency.
- The provider usage example passed a fresh options object each render, which could recreate the retry service. Memoized the options object and typed the retry callback parameter.
- The integration test example used MSW's old `rest` API and an unused `fireEvent` import. Updated it to current MSW `http`/`HttpResponse` usage and removed the unused import.

## Review Notes
The remaining examples are illustrative and not wired into a single compilable project, so no repository test suite was run for this standalone blog post. The timeout examples still demonstrate caller-side timeout behavior for generic promises; for real `fetch` cancellation, an `AbortController` should be passed into the operation being timed out.
