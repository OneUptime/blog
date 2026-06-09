# Validation Summary: How to Handle Errors in GraphQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL (specification, error format, schema types, unions)
- Apollo Server v4 (`@apollo/server`, `formatError`, plugins, `didEncounterErrors`)
- Apollo Client v3 (`@apollo/client`, `useQuery`, `useMutation`, `errorPolicy`, cache modification)
- React (hooks, custom hooks, `useMemo`)
- Node.js / JavaScript (class inheritance, `Error.captureStackTrace`)
- Mermaid diagrams

## Sources Consulted
- GraphQL Specification, section on Response Format / Errors: https://spec.graphql.org/October2021/#sec-Errors
- Apollo Server v4 error formatting docs: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server v4 plugins / `didEncounterErrors` hook: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Client error handling docs: https://www.apollographql.com/docs/react/data/error-handling
- Apollo Client `errorPolicy` reference: https://www.apollographql.com/docs/react/data/error-handling#graphql-error-policies
- Apollo Client cache `cache.modify` / `writeFragment`: https://www.apollographql.com/docs/react/caching/cache-interaction
- Node.js `Error.captureStackTrace` (V8 docs)
- React hooks reference for `useMemo`: https://react.dev/reference/react/useMemo

## Issues Found
1. **Missing `useMemo` import** in the Client-Side Error Handling section. The code uses `useMemo` inside the custom hook, but only `useQuery` and `useMutation` were imported from `@apollo/client`. Added `import { useMemo } from 'react';` so the example actually compiles.
2. **Undefined `refetch` in `UserProfile`** component. The component called `refetch()` from its retry handlers, but `refetch` was not destructured from `useUserQuery`, and the hook did not return it. Fixed by:
   - Destructuring `refetch` from `useQuery` inside `useUserQuery`.
   - Returning `refetch` from `useUserQuery`.
   - Destructuring `refetch` in `UserProfile`.

## Review Notes
- The class `GraphQLError` defined in the post shares its name with the `GraphQLError` exported by the `graphql` package. The post's example code is internally consistent (it does not import the official class), but readers who mix the two in a real project would need to disambiguate (e.g., rename the custom class or alias the import). Not a correctness bug in the post.
- The statement "GraphQL always returns a 200 OK status" is a common simplification. The GraphQL-over-HTTP spec and Apollo Server v4 may return 4xx for parse/validation/auth errors when using the `application/graphql-response+json` content type. For the `application/json` content type covered by the post's examples, 200 is the dominant convention, so this is acceptable.
- `Error.captureStackTrace` is a V8/Node.js extension. It will not throw in non-V8 runtimes but may be a no-op. Fine for the Apollo Server (Node.js) context shown.
- `canViewProfile` is referenced but not defined in the resolver snippet; this is conventional placeholder code in tutorial examples and not an error.
- The `value: String` field on the schema-level `ValidationError` union member would not accept non-string input values verbatim, but the resolver always coerces inputs to strings via the JSON examples shown — acceptable for a tutorial.
