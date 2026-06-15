# Validation Summary: How to Build Multi-Tenant APIs in Node.js

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- AsyncLocalStorage
- Multi-tenant SaaS API architecture

## Sources Consulted
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Node.js HTTP headers documentation: https://nodejs.org/api/http.html
- Express 5.x API reference: https://expressjs.com/en/api/
- Prisma Client query extensions documentation: https://www.prisma.io/docs/orm/prisma-client/client-extensions/query
- Prisma ORM v7 upgrade guide: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- Prisma schema reference for JSON defaults: https://www.prisma.io/docs/orm/reference/prisma-schema-reference

## Issues Found
- The AsyncLocalStorage helper used the `Tenant` type without importing it. Updated the import to include `Tenant`.
- The tenant context middleware used the `Tenant` type without importing it. Updated the import to include `Tenant`.
- The Prisma tenant enforcement example used `prisma.$use`, which has been deprecated and removed in current Prisma versions. Replaced the section with a Prisma Client query extension using `$extends` and included current read/write operation variants such as `findUniqueOrThrow`, `groupBy`, `upsert`, and `updateManyAndReturn`.
- The application setup still called the old Prisma middleware setup function. Updated it to instantiate the tenant-aware extended Prisma client.
- The `ProjectService` constructor was typed as `PrismaClient`, which does not accurately describe an extended Prisma client. Updated it to use `Prisma.TransactionClient`, which covers the model delegates used by the service.
- The tenant isolation test referenced the Prisma-generated `Tenant` type without importing it. Updated the import.
- The summary described the Prisma application hook as database row-level security. Updated the wording to describe it as Prisma Client tenant enforcement.

## Review Notes
- The Prisma Client extension shown is application-level tenant enforcement, not a substitute for database-native PostgreSQL row-level security policies in high-compliance systems.
- The tutorial intentionally uses simplified tenant identification examples. Production systems should also validate custom domains, trusted proxies, JWT claims, and authorization rules carefully.
