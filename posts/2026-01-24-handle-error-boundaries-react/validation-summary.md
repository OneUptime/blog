# Validation Summary: How to Handle Error Boundaries in React

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- JavaScript
- React class component lifecycle methods
- TanStack Query / React Query
- react-error-boundary
- React Testing Library
- Jest

## Sources Consulted
- React Component API documentation: https://react.dev/reference/react/Component
- React legacy Error Boundaries documentation: https://legacy.reactjs.org/docs/error-boundaries.html
- TanStack Query QueryErrorResetBoundary documentation: https://tanstack.com/query/v5/docs/framework/react/reference/QueryErrorResetBoundary
- TanStack Query useQuery documentation: https://tanstack.com/query/v5/docs/framework/react/reference/useQuery
- TanStack Query Suspense and error boundary guidance: https://tanstack.com/query/v5/docs/framework/react/guides/suspense
- react-error-boundary README: https://github.com/bvaughn/react-error-boundary

## Issues Found
- The introduction and crash explanation were too broad because React error boundaries catch render, lifecycle, and constructor errors, but not event handlers, most asynchronous callbacks, server-side rendering, or errors thrown by the boundary itself. Updated the wording to include those limitations.
- The basic `ErrorBoundary` test expected an `onError` callback, but the component did not accept or call that prop. Added an optional `this.props.onError(error, errorInfo)` call in `componentDidCatch`.
- The custom `handleAsyncError` hook comment said rethrowing inside a Promise rejection would trigger a nested error boundary. React error boundaries do not catch ordinary asynchronous Promise rejections, so the comment now says the rethrow lets callers handle the returned rejection.
- The TanStack Query example used the older `useErrorBoundary: true` option with `@tanstack/react-query`. Current TanStack Query v5 uses `throwOnError: true` for this behavior, so the example was updated.
- The TanStack Query example used `useQuery` without importing it. Added `useQuery` to the import from `@tanstack/react-query`.
- The reset test clicked the retry button while the child was still configured to throw, which would immediately put the boundary back into the fallback state. Updated the test to rerender with the non-throwing child before clicking retry.
- The section title referenced SWR, but the code only demonstrated TanStack Query. Renamed the section to "Error Boundary with TanStack Query Integration" to match the implementation shown.

## Review Notes
The examples are generally accurate as React examples, but they remain illustrative snippets rather than complete production modules. In particular, real applications should avoid exposing raw error details to end users in production fallback UIs and should ensure reset handlers also reset the application state that caused the original error.
