# Validation Summary: How to Handle Pagination in GraphQL APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL schema design
- GraphQL cursor pagination
- Relay-style connections
- Prisma Client pagination
- Apollo Client React `useQuery` and `fetchMore`
- React Hooks
- Intersection Observer API
- JavaScript / JSX

## Sources Consulted
- GraphQL pagination guide: https://graphql.org/learn/pagination/
- GraphQL Cursor Connections Specification: https://relay.dev/graphql/connections.htm
- GraphQL.js cursor pagination guide: https://www.graphql-js.org/docs/cursor-based-pagination/
- Prisma Client pagination documentation: https://www.prisma.io/docs/orm/prisma-client/queries/pagination
- Apollo Client React pagination documentation: https://www.apollographql.com/docs/react/pagination/core-api
- React `useRef` documentation: https://react.dev/reference/react/useRef
- React `useCallback` documentation: https://react.dev/reference/react/useCallback
- MDN Intersection Observer API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

## Issues Found
- The reusable connection builder used `decodeCursor()` but did not define or import it, and the following resolver example used `encodeCursor()` without importing it. Added cursor helper functions to the connection-builder snippet and exported/imported `encodeCursor` so the example is self-contained.
- The reusable connection builder did not normalize `first` and `last` values before using them as limits, so negative values could produce invalid pagination behavior. Added a `normalizeLimit()` helper that clamps values between 1 and 100 with a default of 10, matching the article's earlier validation pattern.
- The post described cursor pagination as using a unique identifier. Updated the wording to say cursors are usually derived from a stable sort key, which is more accurate for cursor pagination and Relay-style pagination.
- The comparison table claimed cursor and Relay pagination performance is `O(1)`. Updated this to "Index-friendly" because cursor pagination avoids skipped-row scans but is not generally constant-time independent of database indexes and page size.

## Review Notes
The examples are intentionally framework-agnostic and assume Prisma-like resolver context objects such as `db.users.findMany()`. Relay `PageInfo` behavior can be implemented with more precise `hasPreviousPage` / `hasNextPage` checks when the backing data source can efficiently determine both directions.
