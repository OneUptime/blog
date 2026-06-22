# Validation Summary: How to Mock API Calls in React Tests with MSW (Mock Service Worker)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MSW (Mock Service Worker) v2 — `http`, `HttpResponse`, `setupServer`, `delay`, `server.events`
- React (function components, hooks)
- Jest (jsdom test environment)
- React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- TanStack Query (React Query) v5
- TypeScript (typed handlers)
- `@faker-js/faker` (test data factories)

## Sources Consulted
- MSW official docs — delay API: https://mswjs.io/docs/api/delay/
- MSW official docs — response timing: https://mswjs.io/docs/http/mocking-responses/response-timing/
- MSW official docs — WebSocket mocking: https://mswjs.io/docs/websocket/
- MSW official docs — `ws` namespace: https://mswjs.io/docs/api/ws/
- TanStack Query — remove custom logger (v5): https://github.com/TanStack/query/issues/4675
- TanStack Query v5 roadmap discussion: https://github.com/TanStack/query/discussions/4252
- TanStack Query v4 custom logger docs (showing the now-removed API): https://tanstack.com/query/v4/docs/framework/react/guides/custom-logger

## Issues Found
1. **React Query `logger` option used alongside v5-only `gcTime` (incorrect/contradictory).** The `createTestQueryClient` example used `gcTime: 0` with the comment "(formerly cacheTime)", which targets TanStack Query v5, but also passed a `logger` object to the `QueryClient`. The custom `logger` option was removed in TanStack Query v5 (it was a v4 feature), and v5 no longer logs query errors to the console by default, so the option is both unsupported and unnecessary. **Fix:** Removed the `logger: { log, warn, error }` block from the test `QueryClient` configuration, leaving the valid `retry: false` / `gcTime: 0` options intact.

2. **Misleading WebSocket mocking statement.** The Additional Resources section said "Use the `ws` package alongside MSW for real-time features," implying a separate third-party package. MSW v2 actually ships first-class WebSocket support via its own built-in `ws` namespace (`import { ws } from 'msw'`). **Fix:** Updated the bullet to "MSW has first-class WebSocket support via its built-in `ws` namespace (`import { ws } from 'msw'`) for real-time features."

## Review Notes
- The core MSW v2 API usage throughout the post is accurate and current: `http.get/post/put/delete`, `HttpResponse.json()`, `HttpResponse.error()`, `new HttpResponse(null, { status })`, `setupServer(...handlers)` from `msw/node`, `server.listen/resetHandlers/close`, `server.use()` for per-test overrides, and the `onUnhandledRequest: 'error' | 'warn'` option.
- The `delay()` claim is correct — calling `delay()` with no arguments applies a realistic random server response time of roughly 100–400ms, per the official docs.
- The Jest config requirement `testEnvironmentOptions: { customExportConditions: [''] }` is the correct and documented workaround needed for MSW v2 to resolve its Node export conditions under jsdom.
- The `server.events.on('request:start' | 'request:match' | 'request:unhandled', ...)` debugging hooks are valid MSW v2 lifecycle events.
- The TypeScript generic signatures `http.get<Params, RequestBody, ResponseBody>` and `http.post<Params, RequestBody, ResponseBody>` match the MSW v2 typing order; `never` for an absent request body is appropriate.
- The `@faker-js/faker` calls (`faker.string.uuid()`, `faker.person.fullName()`, `faker.internet.email()`, `faker.image.avatar()`) use the current v8+ namespaced API.
- `crypto.randomUUID()` is globally available in modern Node (19+) and jsdom; fine for the examples.
- The "Fetch not defined" troubleshooting row recommends node-fetch/undici — relevant only for older Node; Node 18+ provides a global `fetch`, which MSW v2 relies on. Not incorrect, just version-dependent.
