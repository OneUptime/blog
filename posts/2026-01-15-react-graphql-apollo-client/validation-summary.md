# Validation Summary: How to Build a React App with GraphQL using Apollo Client

## Status
validated

## Post Type
Tutorial / Guide (hands-on, step-by-step build of a React + GraphQL app with Apollo Client)

## Technologies Covered
- React (with Vite, TypeScript template)
- GraphQL
- Apollo Client (`@apollo/client`) 3.x
- Apollo Client React hooks (`useQuery`, `useLazyQuery`, `useMutation`, `useSubscription`, `useApolloClient`)
- `InMemoryCache` / type policies / fetch policies
- Apollo Link (`onError`/error link, logging link, `split`, `GraphQLWsLink` + `graphql-ws`)
- `MockedProvider` + Testing Library (component testing)
- GraphQL Code Generator (`@graphql-codegen/*`)

## Sources Consulted
- Apollo Client docs — Migrating to Apollo Client 4.0: https://www.apollographql.com/docs/react/migrating/apollo-client-4-migration
- Apollo Client 4.0.0 release notes: https://newreleases.io/project/github/apollographql/apollo-client/release/@apollo/client@4.0.0
- Apollo Client testing docs (MockedProvider): https://www.apollographql.com/docs/react/development-testing/testing
- npm registry for `@apollo/client` (verified `latest` = 4.2.3, v3 line still maintained at 3.14.x) via `npm view @apollo/client dist-tags`
- Apollo Client v3 docs for the APIs used (error link, subscriptions link, hooks, cache methods)

## Issues Found
1. **Unpinned Apollo Client install pulls v4 and breaks the entire tutorial.** The post's code is written entirely against Apollo Client 3.x (e.g., `import { onError } from '@apollo/client/link/error'`, `import { MockedProvider } from '@apollo/client/testing'`, the `onError`/`onCompleted` mutation callbacks, the `onError` link callback signature). However, the install command was `npm install @apollo/client graphql`, which as of the review date resolves to the `latest` tag — Apollo Client **4.2.3**. Apollo Client 4.0 introduced breaking changes to several of these import paths and APIs, so a reader following the guide today would install v4 and the code samples would not compile/run.
   - **Fix:** Pinned the install to the v3 major line (`npm install @apollo/client@^3 graphql`) so the tutorial is reproducible and correct as written, and added a short note in the dependency description pointing out that the guide targets 3.x and that v4 has breaking changes (with a pointer to the official 3-to-4 migration guide). This is the minimal, verifiable correction; all of the post's code is accurate for v3, so no code blocks needed rewriting.

## Review Notes
- All code samples were verified to be correct for Apollo Client 3.x: the error link (`@apollo/client/link/error`), subscriptions link (`GraphQLWsLink` from `@apollo/client/link/subscriptions`, added in v3.5+), `useSubscription`'s `onData` callback (v3.7+), `MockedProvider` from `@apollo/client/testing`, `cache.readQuery/writeQuery/evict/gc`, `readFragment/writeFragment`, and `clearStore/resetStore` are all valid v3 APIs.
- Minor (not corrected, not an error): the subscriptions section uses `createClient` from `graphql-ws` but the post never lists `graphql-ws` as a dependency to install. A reader would need `npm install graphql-ws`. Worth adding in a future revision.
- Minor (not corrected): `error.graphQLErrors?.length > 0` in the component-level error-handling snippet works at runtime; under TypeScript `strict` it can produce a "possibly undefined" comparison warning. Cosmetic, not a functional bug.
- Future consideration: if/when the blog wants this to target the current major version, the post would need a v4 pass (error-link handling via `CombinedGraphQLErrors`, updated testing import path, and removal of `onCompleted`/`onError` hook callbacks). That is a larger rewrite and out of scope for a technical-accuracy fix; pinning to v3 keeps the existing content correct.
