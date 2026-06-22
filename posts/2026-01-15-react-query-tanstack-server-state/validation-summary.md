# Validation Summary: How to Use React Query (TanStack Query) for Server State Management

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- React
- TanStack Query / React Query v5
- TanStack Query Devtools
- Fetch API
- Axios
- React Router
- Jest
- React Testing Library
- React Suspense

## Sources Consulted
- TanStack Query React `useQuery` reference: https://tanstack.com/query/v5/docs/framework/react/reference/useQuery
- TanStack Query React `useMutation` reference: https://tanstack.com/query/v5/docs/framework/react/reference/useMutation
- TanStack Query QueryCache reference: https://tanstack.com/query/latest/docs/reference/QueryCache
- TanStack Query MutationCache reference: https://tanstack.com/query/v5/docs/reference/MutationCache
- TanStack Query React Query Keys guide: https://tanstack.com/query/v5/docs/framework/react/guides/query-keys
- TanStack Query Important Defaults guide: https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults
- TanStack Query Optimistic Updates guide: https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates
- TanStack Query Initial Query Data guide: https://tanstack.com/query/v5/docs/framework/react/guides/initial-query-data
- TanStack Query Placeholder Query Data guide: https://tanstack.com/query/v5/docs/framework/react/guides/placeholder-query-data
- TanStack Query Infinite Queries guide: https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
- TanStack Query Testing guide: https://tanstack.com/query/latest/docs/framework/react/guides/testing
- TanStack Query v5 Migration guide: https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5

## Issues Found
- Query key description incorrectly said keys can be strings or arrays. Updated it to state that TanStack Query v5 query keys must be arrays at the top level and can contain serializable values.
- Query state comments blurred `isPending` and `isLoading`. Updated comments to match v5: `isPending` derives from `status`, while `isLoading` is true when the first fetch is in progress.
- Mutation lifecycle and global mutation cache callback examples used `context` as the third callback argument. Updated names to `onMutateResult` to match the v5 callback signatures.
- The global error-handling example used `QueryCache`, `QueryClient`, and `MutationCache` without importing them. Added the import from `@tanstack/react-query`.
- The mutation test did not match the shown `CreateTodo` component: it mocked an unused `createTodo`, queried the wrong placeholder, and expected the wrong mutation payload. Updated the test to mock `fetch`, use the actual placeholder, and assert the POST request body.
- The query key factory snippet was labeled `query-keys.js` while using TypeScript `as const` syntax. Renamed the comment to `query-keys.ts`.

## Review Notes
The article is broadly accurate for TanStack Query v5 after the fixes. Some examples remain intentionally abbreviated and assume surrounding app imports/components such as `Router`, `Spinner`, `fetchUser`, and API helpers exist in the consuming application.
