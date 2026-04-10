# Validation Summary: How to Use Redis for Next.js Server-Side Session Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Next.js (App Router and Pages Router)
- iron-session (v8.x)
- NextAuth.js (v4)
- @auth/upstash-redis-adapter
- @upstash/redis
- Node.js

## Sources Consulted
- iron-session npm README and GitHub repo (https://github.com/vvo/iron-session) — verified `getIronSession` API, session options, `.save()` and `.destroy()` methods
- NextAuth.js v4 documentation (https://next-auth.js.org/) — verified Credentials provider limitations, session strategies, `getServerSession` usage
- Auth.js adapters documentation (https://authjs.dev/getting-started/adapters) — verified available Redis adapters; confirmed `@auth/redis-adapter` does not exist, only `@auth/upstash-redis-adapter`
- @auth/upstash-redis-adapter npm page — verified `UpstashRedisAdapter` export and `@upstash/redis` client requirement
- node-redis npm documentation — verified `createClient`, `setEx`, `del` APIs

## Issues Found

1. **Fictional package `@auth/redis-adapter`**: The blog referenced `@auth/redis-adapter` with a `RedisAdapter` export. This package does not exist. The correct package is `@auth/upstash-redis-adapter` which exports `UpstashRedisAdapter`. Fixed the install command, import, and adapter usage.

2. **Wrong Redis client type**: The blog used `createClient` from the `redis` (node-redis) package. The `@auth/upstash-redis-adapter` requires an `@upstash/redis` client which uses HTTP/REST. Changed to `import { Redis } from "@upstash/redis"` with the proper constructor using `url` and `token` parameters.

3. **Credentials provider with database session strategy**: The blog used `session: { strategy: "database" }` with the Credentials provider. NextAuth.js v4 explicitly documents that the Credentials provider only works with JWT sessions — database sessions are not supported for this provider. Changed to `session: { strategy: "jwt" }`.

4. **Mixed Pages Router and App Router file paths**: The NextAuth config was at `pages/api/auth/[...nextauth].js` (Pages Router) but the Server Component imported from `../api/auth/[...nextauth]/route` (App Router). Moved the NextAuth config to `app/api/auth/[...nextauth]/route.js` for consistency with the App Router Server Component.

5. **Missing `authOptions` export**: The NextAuth config passed options inline to `NextAuth()` without exporting them, but the Server Component imported `authOptions`. Added a named `authOptions` export and the App Router handler pattern (`export { handler as GET, handler as POST }`).

6. **Missing `redirect` import**: The Server Component used `redirect("/login")` without importing it. Added `import { redirect } from "next/navigation"`.

## Review Notes
- The iron-session section (Option 1) is fully correct and well-written. The `getIronSession` API, session options, `.save()`, and `.destroy()` are all used correctly per iron-session v8.x.
- The `CredentialsProvider` import was renamed from `Credentials` to `CredentialsProvider` to match NextAuth.js documentation conventions. Both work as it is a default export, but `CredentialsProvider` is the idiomatic name.
- The `getServerSession` import from `"next-auth"` works but the canonical documented path is `"next-auth/next"`. Left as-is since both are valid.
- The summary paragraph's characterization of next-auth as using "JWT" is now accurate after fixing the session strategy from "database" to "jwt".
