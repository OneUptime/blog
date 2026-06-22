# Validation Summary: How to Configure React Query for Data Fetching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- TanStack Query / React Query
- React Query Devtools
- TypeScript
- JavaScript Fetch API
- React Intersection Observer
- React Router

## Sources Consulted
- TanStack Query React installation and Devtools docs: https://tanstack.com/query/v5/docs/framework/react/devtools
- TanStack Query important defaults: https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults
- TanStack Query `useQuery` reference: https://tanstack.com/query/v5/docs/framework/react/reference/useQuery
- TanStack Query query keys guide: https://tanstack.com/query/v5/docs/framework/react/guides/query-keys
- TanStack Query query invalidation guide: https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
- TanStack Query mutations guide: https://tanstack.com/query/v5/docs/framework/react/guides/mutations
- TanStack Query optimistic updates guide: https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates
- TanStack Query paginated queries guide: https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries
- TanStack Query `useInfiniteQuery` reference: https://tanstack.com/query/latest/docs/framework/react/reference/useInfiniteQuery
- TanStack Query `QueryClient` reference: https://tanstack.com/query/latest/docs/reference/QueryClient
- React TypeScript reference: https://react.dev/learn/typescript

## Issues Found
- The `UserProfile` example rendered `user.name` after checking `isLoading` and `isError`, but `data` can still be `undefined` in TanStack Query v5. Added a guard before rendering user fields.
- The query key factory referenced `UserFilters` and `PostFilters` without defining or importing them. Added minimal interfaces in the snippet.
- The `usePosts`, paginated posts, infinite posts, and prefetch snippets referenced local API functions or types without enough context for the shown files to type-check. Added minimal `Post` interfaces and fetch functions where needed.
- The `CreatePostForm` snippet used `React.FormEvent` without importing the `React` namespace. Changed it to import `type FormEvent` from React.
- The optimistic update example referenced an undefined `updatePost` function and `Post` type. Added a minimal `updatePost` implementation and `Post` interface.
- The optimistic cache updater typed `old` as always defined, but `setQueryData` updaters can receive `undefined`. Updated the callback to handle `undefined`.
- The infinite query response used `firstPage.previousCursor` without declaring `previousCursor`. Added it as an optional response field.
- The infinite query fetcher used a truthiness check for `cursor`, which would treat `0` as no cursor. Changed it to an explicit `cursor !== null` check.
- The infinite list component could access `data.pages` while `data` was still undefined. Added a guard.
- The global retry example detected client errors by checking whether the error message contained `"4"`, which can misclassify errors. Updated it to check an attached numeric `status` property.
- The global query error handler comments described the condition inaccurately. Updated the comments to match the actual background-refetch behavior.

## Review Notes
The post is aligned with TanStack Query v5 APIs, including `gcTime`, `placeholderData: keepPreviousData`, `initialPageParam`, object-form query options, `isPending` for mutations, and current Devtools package usage. Some examples still assume application-specific components such as `PostCard` and server API response shapes; those assumptions are reasonable for a tutorial but should be implemented in a real application.
