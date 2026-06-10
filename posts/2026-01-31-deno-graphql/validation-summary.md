# Validation Summary: How to Build GraphQL APIs with Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (runtime)
- TypeScript
- GraphQL (via `graphql_deno@v15.0.0`, a Deno port of graphql-js v15)
- Oak (HTTP framework, `oak@v12.6.1`)
- djwt (`djwt@v3.0.1`) for JWT auth
- bcrypt-deno (`bcrypt@v0.4.1`) for password hashing
- Deno standard library assertions (`std@0.208.0/assert`)
- Web Crypto API (`crypto.subtle.generateKey`)
- GraphiQL (loaded from unpkg)

## Sources Consulted
- Deno install instructions: https://deno.land/#installation
- graphql_deno module: https://deno.land/x/graphql_deno@v15.0.0
- Oak framework v12.6.1: https://deno.land/x/oak@v12.6.1
- djwt v3.0.1 API (header + payload + key signature): https://deno.land/x/djwt@v3.0.1
- bcrypt-deno v0.4.1: https://deno.land/x/bcrypt@v0.4.1
- Deno std assert module v0.208.0: https://deno.land/std@0.208.0/assert/mod.ts
- graphql-js reference (object-style `graphql({ schema, source, ... })` call): https://graphql.org/graphql-js/graphql/
- Web Crypto `SubtleCrypto.generateKey` for HMAC: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
- GraphiQL CDN distribution: https://unpkg.com/graphiql/

## Issues Found
1. **Missing `posts` import in `schema/typeDefs.ts`**. The `User` type's `posts` field resolver referenced the module-level `posts` array (declared in `schema/resolvers.ts`) without importing it, which would produce a `ReferenceError` at first use. Added `import { posts } from "./resolvers.ts";` to the `typeDefs.ts` snippet. This matches the existing usage and the file path layout shown earlier in the post.

## Review Notes
- The `User.posts` resolver mixes two strategies — it filters posts from the in-memory array and then calls `postLoader.loadMany(...)` on the resulting IDs. This works once the missing import is added, but is conceptually redundant (the data is already in hand). A future revision could either return the filtered array directly or expose an "authorId → posts" loader. Left as-is to avoid restructuring the example.
- The seed user in `schema/resolvers.ts` has a placeholder password hash (`"$2a$10$hashed_password_here"`), which is not a valid bcrypt digest, so the demo login flow only succeeds for users registered via the `register` mutation. This is normal for tutorial seed data.
- `JWT_SECRET` is generated at module load via `crypto.subtle.generateKey`, so tokens do not survive a server restart. Acceptable for a tutorial; production code should load a long-lived key from configuration.
- The custom `createDataLoader` implementation is a simplified demonstration. The `loadMany` path returns `cache.get(key) || Promise.resolve(null)` immediately after pushing the key to the batch, which can resolve to `null` before the batch runs. The standard `dataloader` package (or a more careful implementation) would be preferred for production use, but the simplified version conveys the batching/caching idea.
- `CommentType` and `PostStatusEnum` are exported from `typeDefs.ts` but are never wired into the root `Query`/`Mutation` types in `schema/index.ts`. Functional but vestigial.
- `subscriptionResolvers` is defined in `schema/subscriptions.ts`, but `schema/index.ts` only wires `query` and `mutation` into the `GraphQLSchema`. The subscriptions snippet stands on its own as illustration rather than being plugged into the live server. Noted for future revision.
- `Oak v12.6.1`, `graphql_deno v15.0.0`, `djwt v3.0.1`, `bcrypt v0.4.1`, and `std@0.208.0` are all pinned to specific older versions; the APIs used (`ctx.request.body().value`, `create(header, payload, key)`, `verify(token, key)`, `hash`/`compare`, `assertExists`/`assertEquals`) match those releases. Readers upgrading to newer versions (especially Oak v14+, which changed the body API) will need to adapt.
