# Validation Summary: How to Use React with React Testing Library

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Testing Library (`@testing-library/react`)
- `@testing-library/jest-dom`
- `@testing-library/user-event` (v14 API with `userEvent.setup()`)
- Jest (jsdom environment, `setupFilesAfterEach`, `moduleNameMapper`, transform)
- React (function components, hooks: `useState`, `useEffect`)
- `renderHook` and `act` from `@testing-library/react`
- React Router (`BrowserRouter`)
- Mock Service Worker (MSW)
- `identity-obj-proxy` for CSS module mocking

## Sources Consulted
- React Testing Library documentation — https://testing-library.com/docs/react-testing-library/intro/
- Testing Library queries / query priority — https://testing-library.com/docs/queries/about/#priority
- `user-event` v14 docs — https://testing-library.com/docs/user-event/intro
- `renderHook` in `@testing-library/react` v13+ — https://testing-library.com/docs/react-testing-library/api/#renderhook
- MSW v1 → v2 migration guide — https://mswjs.io/docs/migrations/1.x-to-2.x
- MSW handler API (`http`, `HttpResponse`) — https://mswjs.io/docs/api/http
- Jest configuration — https://jestjs.io/docs/configuration
- `jest-dom` custom matchers — https://github.com/testing-library/jest-dom

## Issues Found
- **MSW v1 syntax (outdated).** The "Mocking Modules and APIs" section used the pre-2.0 `rest` API with `(req, res, ctx)` handler signatures (`rest.get`, `res(ctx.status(...), ctx.json(...))`, `req.params`, `req.json()`). MSW 2.0 was released in October 2023 and replaced this with `http` + `HttpResponse`, destructured `{ params, request }` handler args, and a Fetch-style `HttpResponse.json(body, { status })` return. For a 2026-dated post this is the correct API to teach. Updated `src/mocks/handlers.js` (GET collection, GET by id, POST) and the two `server.use(...)` override examples in `UserList.test.jsx`, and changed the import from `rest` to `http, HttpResponse`. No behavior in the examples changed.

## Review Notes
- Query priority list (Role → LabelText → PlaceholderText → Text → DisplayValue → AltText → Title → TestId) matches the official Testing Library priority.
- `userEvent.setup()` pattern and `await user.click(...)` / `await user.type(...)` are correct for `user-event` v14.
- `renderHook` and `act` imported from `@testing-library/react` are correct for RTL v13+ (the old `@testing-library/react-hooks` package is no longer needed).
- `configure({ throwSuggestions: true })` is a valid RTL configuration option.
- `screen.logTestingPlaygroundURL()` and `logRoles` from `@testing-library/dom` are valid debugging utilities.
- The MSW server setup snippet places `setupServer` and the lifecycle hooks (`beforeAll`/`afterEach`/`afterAll`) in the same code block under two file-path comments — that's a stylistic choice rather than a technical error, but a reader copying the block would need to split it across the two files.
- The `findByText` query for "Member since:" in the UserProfile test will match because the text node contains that substring; this works because RTL's text matcher normalizes whitespace and supports substring matching via regex.
