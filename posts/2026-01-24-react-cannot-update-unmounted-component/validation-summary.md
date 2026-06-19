# Validation Summary: How to Fix 'Cannot Update State on Unmounted Component'

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- JavaScript
- React Hooks
- Fetch API
- AbortController
- Axios
- TanStack Query / React Query
- SWR
- Jest
- React Testing Library

## Sources Consulted
- React useEffect reference: https://react.dev/reference/react/useEffect
- React react-dom/test-utils deprecation warning: https://react.dev/warnings/react-dom-test-utils
- React 18 working group discussion on removing the unmounted setState warning: https://github.com/reactwg/react-18/discussions/82
- MDN AbortController abort() reference: https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort
- Axios cancellation documentation: https://axios-http.com/docs/cancellation
- TanStack Query query cancellation documentation: https://tanstack.com/query/v5/docs/framework/react/guides/query-cancellation
- SWR getting started documentation: https://swr.vercel.app/docs/getting-started

## Issues Found
- The introduction implied that every unmounted state update represents an underlying memory leak. React 18 removed the warning because many Promise-based cases are harmless and the warning was misleading, while subscriptions, timers, and uncanceled requests can still leak or waste work. Updated the wording to make that distinction.
- The async custom hook assigned `const cleanup = asyncEffect(context)` and described calling an additional cleanup function, but the shown usage passes an `async` function, so any returned cleanup would be wrapped in a Promise and never called by the code. Removed the unsupported cleanup handling from the snippet.
- The complete `useFetch` example used `[url, loading]` as the effect dependencies and `refetch` set `loading` to `true`. This caused extra fetches when `loading` changed back to `false`. Replaced that trigger with a `refreshIndex` state value and changed the dependencies to `[url, refreshIndex]`.
- The complete `useFetch` example did not clear stale data or errors when `url` became falsy. Added `setData(null)` and `setError(null)` in the no-URL branch.
- The testing example imported `act` from `react-dom/test-utils`, which React now documents as deprecated. Updated it to import `act` from `react`, and removed unused `screen` and `waitFor` imports.
- The summary table said AbortController "Only works with fetch", but Axios and other APIs can support `AbortSignal`. Updated the table to say it applies to APIs that accept `AbortSignal` and requires API support.

## Review Notes
The examples are intentionally simplified and omit some production concerns, such as dependency-lint handling for custom hooks, SSR-safe access to `window`, and consuming TanStack Query's provided `AbortSignal` inside `queryFn` when request cancellation is required.
