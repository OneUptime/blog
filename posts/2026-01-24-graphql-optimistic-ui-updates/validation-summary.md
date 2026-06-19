# Validation Summary: How to Handle Optimistic UI Updates with GraphQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- Apollo Client
- React
- TypeScript / JSX examples
- Client-side caching and optimistic UI updates

## Sources Consulted
- Apollo Client documentation: Optimistic mutation results - https://www.apollographql.com/docs/react/performance/optimistic-ui
- Apollo Client documentation: Mutations and cache updates - https://www.apollographql.com/docs/react/data/mutations
- Apollo Client documentation: Reading and writing data to the cache - https://www.apollographql.com/docs/react/caching/cache-interaction
- Apollo Client documentation: Core pagination API - https://www.apollographql.com/docs/react/pagination/core-api
- React documentation: useState - https://react.dev/reference/react/useState
- React documentation: useRef - https://react.dev/reference/react/useRef
- React documentation: useEffect - https://react.dev/reference/react/useEffect

## Issues Found
- The comment in the comment creation example said a negative number was used to identify optimistic entries, but the code used a `temp-` string prefix. Updated the comment to match the code.
- The custom mutation hook described `onCompleted` as being called when the optimistic response is applied. Apollo Client documents `onCompleted` as running when the mutation successfully completes, so the comment was corrected.
- The concurrent optimistic updates example used `getPendingUpdate` inside `BulkActions` without destructuring it from `useConcurrentOptimisticUpdates()`. Updated the destructuring so the example is syntactically correct.

## Review Notes
The examples assume Apollo Client's default normalized cache IDs (`__typename:id`) and schemas whose mutation payloads match the shown optimistic response shapes. The pagination example is a reasonable illustrative use of `cache.modify`, but a production application with cursor pagination should also define appropriate field policies such as `keyArgs` and merge behavior for its paginated field.
