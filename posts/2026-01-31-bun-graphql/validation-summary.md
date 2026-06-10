# Validation Summary: How to Build GraphQL APIs with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime (Bun.serve, Bun.password, bun:test, bun init)
- GraphQL (graphql, GraphQLError)
- graphql-yoga (createYoga, createPubSub)
- @graphql-tools/schema (makeExecutableSchema)
- DataLoader (batching/caching)
- jsonwebtoken (JWT signing/verification)
- TypeScript

## Sources Consulted
- graphql-yoga subscriptions docs: https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions
- graphql-yoga Bun integration docs: https://the-guild.dev/graphql/yoga-server/docs/integrations/integration-with-bun
- graphql-yoga WebSocket discussion: https://github.com/graphql-hive/graphql-yoga/discussions/3041
- Bun password hashing API: https://bun.sh/docs/api/hashing
- Bun init / templating docs: https://bun.com/docs/runtime/templating/init
- GraphQL spec / `GraphQLError` (graphql-js v16+ extensions option)

## Issues Found

1. **Incorrect `pubsub.subscribe` filter option.** The original `commentAdded` resolver called `pubsub.subscribe(COMMENT_ADDED, { filter: (payload) => ... })`. graphql-yoga's `createPubSub` does NOT accept a `filter` option — `subscribe(topic)` and `subscribe(topic, id)` are the only forms; filtering is done either via topic IDs or by composing the returned async iterable. **Fix:** Switched to the idiomatic topic-ID pattern: the publisher now calls `pubsub.publish(COMMENT_ADDED, args.postId, { commentAdded: comment })` and the subscription calls `pubsub.subscribe(COMMENT_ADDED, args.postId)`. The `PubSubEvents` type was updated to `[postId: string, { commentAdded: Comment }]` so only subscribers for the same `postId` receive events.

2. **Incorrect `yoga.websocket` claim.** The original "Implementing Subscriptions" section showed `Bun.serve({ fetch: yoga.fetch, websocket: yoga.websocket })`. The yoga instance returned by `createYoga()` does not expose a `.websocket` handler; WebSocket subscription support requires a separate `graphql-ws` setup. **Fix:** Rewrote the section to reflect that graphql-yoga uses SSE for subscriptions by default (works on the same HTTP endpoint with the standard `Bun.serve({ fetch: yoga })` setup), with a brief note that `graphql-ws` is needed if a WebSocket protocol is required.

3. **Unused import.** The first `src/index.ts` snippet imported `createServer` from `"http"` but never used it. **Fix:** Removed the dead import.

## Review Notes
- `Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 })` is correct — Bun's docs explicitly document this signature; cost must be in [4, 31].
- `bun init -y` is correct; `-y` is the documented `--yes` alias.
- The "4x faster than Node.js" startup claim is consistent with widely cited Bun benchmarks; it is a marketing-flavored figure but plausible and not technically wrong.
- The resolvers reference TypeScript types (`Context`, `User`, `Post`, `Comment`, `CreatePostInput`, `UpdatePostInput`, `AuthenticatedContext`) that are not imported in the snippet. This is acceptable for illustrative snippets but readers will need to define these themselves (e.g., `type AuthenticatedContext = Context & { userId: string }` for the `asserts` predicate).
- The test snippets call `graphql({ schema, source, contextValue })` and rely on a real database being wired up; `Query.posts` would not actually pass without a configured `db.posts.findByPublished`. This is illustrative and expected for tutorial code.
- The DataLoader `users`/`posts` loaders are typed `DataLoader<string, User>` / `DataLoader<string, Post>` but their batch functions can return `null` for missing IDs. This is a minor TypeScript-strictness gap (a more precise type would be `DataLoader<string, User | null>`), but it is a common idiomatic shortcut in tutorial code and not a runtime bug.
