# Validation Summary: How to Configure Next.js with Prisma

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js App Router
- Prisma ORM
- Prisma Client
- Prisma Migrate
- PostgreSQL
- PgBouncer / connection pooling
- TypeScript
- React Server Components
- Route Handlers
- Server Actions

## Sources Consulted
- Prisma Client setup and configuration: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction
- Prisma with Next.js guide: https://www.prisma.io/docs/guides/frameworks/nextjs
- Prisma Next.js troubleshooting and singleton guidance: https://www.prisma.io/docs/orm/more/troubleshooting/nextjs
- Prisma CLI reference for `migrate`, `generate`, and `db seed`: https://www.prisma.io/docs/orm/reference/prisma-cli-reference
- Prisma PgBouncer configuration: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
- Prisma connection pool documentation: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
- Prisma Client extensions documentation: https://www.prisma.io/docs/orm/prisma-client/client-extensions
- Next.js Route Handlers documentation: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js Server Actions forms guide: https://nextjs.org/docs/app/guides/forms
- Next.js `revalidatePath` API reference: https://nextjs.org/docs/app/api-reference/functions/revalidatePath

## Issues Found
- Updated the Prisma installation commands to include the current PostgreSQL driver adapter dependencies (`@prisma/adapter-pg`, `pg`, and `@types/pg`) required by Prisma 7.
- Reworded the introduction from "automatic migrations" to "migration workflows" to avoid implying that Prisma runs migrations automatically.
- Updated `prisma init`, `schema.prisma`, and Prisma Client imports to use the current generated client output pattern with `provider = "prisma-client"` and imports from the generated client entrypoint.
- Added `prisma.config.ts` examples because current Prisma CLI configuration stores datasource URL configuration there instead of relying on `url = env("DATABASE_URL")` in `schema.prisma`.
- Updated Prisma Client singleton examples to instantiate `PrismaClient` with a `PrismaPg` adapter, which is required by current Prisma 7 documentation.
- Corrected PgBouncer guidance to note that `pgbouncer=true` is specifically needed for older PgBouncer versions and that PgBouncer should run in transaction mode.
- Fixed TypeScript error handling in the Route Handler by narrowing caught errors with `Prisma.PrismaClientKnownRequestError` before reading `error.code`.
- Added a `Prisma.PostWhereInput` annotation to the complex query filter object so nested string filters such as `mode: 'insensitive'` type-check correctly.
- Fixed the Prisma Client extension `excerpt` computed field so `null` content does not produce the string `undefined...`.
- Updated the serverless pooling example to use the current `PrismaPg` adapter configuration API instead of constructing and passing a `pg.Pool` directly.
- Updated the seed script and seed configuration to use the generated Prisma Client, the PostgreSQL adapter, `tsx`, and the current `prisma.config.ts` seed configuration.
- Fixed the health check Route Handler catch block by narrowing `unknown` errors before reading `message`.
- Updated the production checklist to distinguish runtime pooled URLs from direct migration URLs when using PgBouncer.

## Review Notes
- The examples are technically valid for current Prisma and Next.js patterns, but a production application should still add request validation, authentication, authorization, and password hashing around the mutation examples.
- `@@index([email])` is redundant because `email` is already unique, but it is not technically incorrect.
