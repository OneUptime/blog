# Validation Summary: How to Implement Optimistic Updates in React with React Query

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- TanStack Query / React Query
- TypeScript
- Fetch API
- React Hook Form
- Zod
- React Hot Toast
- use-debounce
- Testing Library
- Mock Service Worker

## Sources Consulted
- TanStack Query React installation docs: https://tanstack.com/query/v5/docs/framework/react/installation
- TanStack Query React optimistic updates guide: https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates
- TanStack Query React useMutation reference: https://tanstack.com/query/latest/docs/framework/react/reference/useMutation
- TanStack Query v5 migration guide: https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5
- TanStack Query QueryClient reference: https://tanstack.com/query/latest/docs/reference/QueryClient
- MSW 1.x to 2.x migration guide: https://mswjs.io/docs/migrations/1.x-to-2.x/
- MSW http API reference: https://mswjs.io/docs/api/http/
- MSW setupServer API reference: https://mswjs.io/docs/api/setup-server/
- React Hook Form resolvers documentation: https://github.com/react-hook-form/resolvers
- Zod documentation: https://zod.dev/

## Issues Found
- The `UpdateTodoInput` and `Todo` types were too narrow for later examples. The debounced update example passed a `title` to `updateTodo`, and the form example added optional todo fields that were not present on `Todo`. Updated the interfaces and PATCH body construction so the examples type-check consistently.
- The delete example removed the individual todo query but only snapshotted and restored the list query. Added cancellation, snapshotting, and rollback for the individual `['todo', todoId]` cache entry.
- The create examples only rolled back when a previous todo list existed, leaving the optimistic item behind if the cache had been empty. Updated rollback to restore the previous list or an empty list.
- The unit test wrapper created its own `QueryClient`, while the tests populated a different `QueryClient`. Updated the helper usage so test setup and hooks use the same client, and disabled retries on the test clients.
- The optimistic update test did not mock a successful fetch. Added a successful fetch mock so the mutation can execute without an unintended runtime failure.
- The MSW integration test used the pre-v2 `rest`, `req`, `res`, and `ctx` API. Updated it to current MSW v2 `http` and `HttpResponse` usage.

## Review Notes
- The TanStack Query examples use the current v5 object-style APIs and `isPending` mutation state. If the code is used in a real app and the UI should remain pending until invalidation refetches finish, return the `queryClient.invalidateQueries(...)` promise from `onSettled`, as noted in the official optimistic updates guide.
