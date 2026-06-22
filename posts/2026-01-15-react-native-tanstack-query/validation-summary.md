# Validation Summary: How to Use React Query (TanStack Query) for Server State in React Native

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- TanStack Query / React Query
- TypeScript
- Axios
- React Navigation
- AsyncStorage
- NetInfo

## Sources Consulted
- TanStack Query QueryClient API: https://tanstack.com/query/latest/docs/reference/QueryClient
- TanStack Query infinite queries guide: https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries
- TanStack Query prefetching guide: https://tanstack.com/query/latest/docs/framework/react/guides/prefetching
- TanStack Query query invalidation guide: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- TanStack Query network mode guide: https://tanstack.com/query/latest/docs/framework/react/guides/network-mode
- TanStack Query persistence guide: https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient
- TanStack Query async storage persister guide: https://tanstack.com/query/latest/docs/framework/react/plugins/createAsyncStoragePersister
- TanStack Query onlineManager reference: https://tanstack.com/query/latest/docs/reference/onlineManager
- React Native FlatList documentation: https://reactnative.dev/docs/flatlist
- React Native ViewToken documentation: https://reactnative.dev/docs/viewtoken
- React Native URLSearchParams documentation: https://reactnative.dev/docs/global-URLSearchParams
- React Native __DEV__ documentation: https://reactnative.dev/docs/global-__DEV__

## Issues Found
- The installation section omitted `axios` even though the API service examples depend on it. Added the install command.
- The API service example referenced authentication behavior without a token lookup implementation. Added a placeholder `getAuthToken` function to keep the interceptor example self-contained.
- The `useUsers` hook accepted filters, but the API service example originally did not pass filters to `/users`. Updated `fetchUsers` to accept optional `UserFilters` and pass them as Axios params.
- `UserFilters` and `PostFilters` needed to be exported because later examples import them. Exported both interfaces.
- The `CreatePostScreen` example used a `navigation` prop without typing it. Added a minimal prop type for the shown `goBack` usage.
- The persistence config snippet imported `PersistQueryClientProvider` in a file that did not use it. Removed the unused import.
- The `offlineFirst` comment said cached data would be used when offline, but TanStack Query documents `offlineFirst` as running the query function once and then pausing retries while offline. Updated the comment.
- The React Native online manager setup used direct online-state updates rather than TanStack Query's documented `onlineManager.setEventListener` integration pattern. Updated it to use `setEventListener`.
- The standalone online status hook treated `isInternetReachable: null` as offline. Changed the check so unknown reachability does not override a connected state unless NetInfo explicitly reports `false`.
- The infinite prefetch example omitted `getNextPageParam`. Added the cursor callback so the prefetch example matches the infinite query pagination pattern.
- The FlatList prefetch-on-viewability example recreated inline viewability callback/config objects. Updated it to use stable callback/config values and typed `ViewToken<Post>` for the callback.

## Review Notes
The examples are aligned with TanStack Query v5 APIs such as `gcTime`, `isPending`, object-style query options, and `initialPageParam` for infinite queries. Some cache-update examples intentionally update only the base list query and invalidate list prefixes for broader consistency; production apps with multiple filtered lists may also use `setQueriesData` for more exhaustive immediate updates.
