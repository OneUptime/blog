# Validation Summary: How to Build a GraphQL API Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (end-to-end, production-oriented build guide)

## Technologies Covered
- GraphQL
- Node.js 20 LTS (installed via NodeSource on Ubuntu)
- Apollo Server 4 (`@apollo/server`, `expressMiddleware` from `@apollo/server/express4`)
- Express
- PostgreSQL
- Prisma ORM (`prisma`, `@prisma/client`)
- JWT authentication (`jsonwebtoken`, `bcryptjs`)
- GraphQL Subscriptions over WebSockets (`graphql-ws`, `ws`, `graphql-subscriptions`)
- Redis PubSub for horizontal scaling (`graphql-redis-subscriptions`, `ioredis`)
- DataLoader (N+1 batching)
- PM2 process manager
- Nginx reverse proxy
- Winston structured logging
- Prometheus metrics (`prom-client`)

## Sources Consulted
- Apollo Server 4 docs — Express integration & `expressMiddleware` / `cors<cors.CorsRequest>()` pattern (https://www.apollographql.com/docs/apollo-server/api/express-middleware)
- Apollo Server 4 subscriptions guide — `makeExecutableSchema` + `graphql-ws` `useServer` + `ApolloServerPluginDrainHttpServer` + `drainServer` cleanup plugin (https://www.apollographql.com/docs/apollo-server/data/subscriptions)
- graphql-ws docs — `useServer`, `graphql-ws/lib/use/ws` import path (v5) (https://github.com/enisdenjo/graphql-ws)
- graphql-subscriptions — `PubSub`, `withFilter`, `asyncIterator`/`asyncIterableIterator` (https://github.com/apollographql/graphql-subscriptions)
- Prisma docs — schema definition, `String[]` scalar lists on PostgreSQL, `mode: 'insensitive'` filters, `migrate dev`, `db seed`, connection pooling (https://www.prisma.io/docs)
- NodeSource Node.js 20 install instructions for Debian/Ubuntu (https://github.com/nodesource/distributions)
- jsonwebtoken docs — `jwt.sign` / `jwt.verify` (https://github.com/auth0/node-jsonwebtoken)
- PM2 docs — ecosystem config fields (`exec_mode`, `instances`, `max_memory_restart`, `wait_ready`, `exp_backoff_restart_delay`), graceful shutdown, `pm2 startup systemd` (https://pm2.keymetrics.io/docs)
- prom-client docs — `Registry`, `Counter`, `Histogram`, `Gauge` (https://github.com/siimon/prom-client)
- Winston docs — custom levels, formats, transports (https://github.com/winstonjs/winston)
- npm CLI docs — `npm ci --omit=dev` (https://docs.npmjs.com/cli/v10/commands/npm-ci)

## Issues Found
1. **JWT payload property name inconsistent with the context/resolver contract (functional bug).**
   The token was signed with `{ userId: user.id, ... }` in both the `register` and `login` resolvers, and the `JwtPayload` interface in `src/middleware/auth.ts` declared `userId: string`. However, `getUser()` returns that raw decoded payload directly as `context.user`, the `Context` type declares `user.id`, and **every** authenticated resolver (`me`, `updateUser`, `createPost`, `updatePost`, `deletePost`) plus the authorization helpers (`checkOwnership`, `checkPermission`) read `context.user.id`. At runtime `context.user.id` would have been `undefined`, silently breaking authentication and all ownership/role checks (e.g. ownership comparisons would never match, and Prisma `where: { id: undefined }` lookups would fail).
   **Fix:** Renamed the JWT payload property from `userId` to `id` in both `jwt.sign(...)` calls and in the `JwtPayload` interface, making the signed token, the decoded payload, the `Context.user` type, and all `context.user.id` accesses consistent. No other logic was changed.

## Review Notes
- **Version-specific import path (`graphql-ws`):** The post imports `useServer` from `graphql-ws/lib/use/ws`, which is correct for graphql-ws v5.x (the version most tutorials and Apollo's own docs target). In graphql-ws v6 the path changed to `graphql-ws/use/ws`. Readers installing the latest major should adjust the import accordingly. Left as-is since the v5 path is valid and still widely used.
- **`pubsub.asyncIterator` deprecation:** `graphql-subscriptions` v2+ deprecated `asyncIterator(...)` in favor of `asyncIterableIterator(...)`. The shown `asyncIterator` still works in current releases, so the code is functional, but readers on newer versions may see a deprecation notice.
- **`npx prisma db seed`** requires a seed script to be configured under `prisma.seed` in `package.json`; the post correctly labels this step as "Optionally seed," so it is accurate as written.
- **`error.code` access in the error-handling section** (`if (error.code === 'P2002')`) is on an `unknown`-typed `catch` variable; under `strict` TypeScript this would need a narrowing guard. This is illustrative resolver code rather than a copy-paste-complete file, so it was left unchanged.
- The REST-vs-GraphQL intro example uses GraphQL query syntax inside a `bash` code fence for illustration; this is intentional pedagogical formatting, not an executable command.
- Historical claim that GraphQL was developed by Facebook in 2012 and open-sourced in 2015 is accurate.
