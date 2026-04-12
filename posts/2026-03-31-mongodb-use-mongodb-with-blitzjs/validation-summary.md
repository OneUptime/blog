# Validation Summary: How to Use MongoDB with Blitz.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Blitz.js (v2+ / toolkit version built on Next.js)
- Prisma ORM (MongoDB connector)
- Zod (schema validation)
- React (useQuery, useMutation hooks)
- TypeScript

## Sources Consulted
- Blitz.js official documentation (https://blitzjs.com/docs)
- Blitz.js RPC documentation (https://blitzjs.com/docs/rpc-setup)
- Blitz.js Prisma CLI documentation (https://blitzjs.com/docs/cli-prisma)
- Blitz.js database overview (https://blitzjs.com/docs/database-overview)
- Prisma MongoDB database connector docs (https://www.prisma.io/docs/orm/overview/databases/mongodb)
- Prisma schema reference (https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
- Prisma CRUD operations (https://www.prisma.io/docs/orm/prisma-client/queries/crud)
- MongoDB connection string options (https://www.mongodb.com/docs/manual/reference/connection-string-options/)

## Issues Found
1. **File paths used `app/` instead of `src/`**: In Blitz.js v2+ (the toolkit version), the project convention changed from `app/` to `src/` for domain code. The blog post referenced `app/tasks/queries/getTasks.ts` and `app/tasks/mutations/createTask.ts`, which follow the old Blitz.js v1 convention. Updated all file path references and import statements to use `src/` (e.g., `src/tasks/queries/getTasks.ts`, `src/tasks/mutations/createTask.ts`).

## Review Notes
- Blitz.js development pace has slowed significantly (latest release v3.0.2 from September 2025, very few commits in 2025). The framework is not archived but is not highly active. This may affect long-term viability of tutorials targeting it.
- The post correctly uses `npx blitz prisma db push` rather than `prisma migrate dev`, since Prisma Migrate does not support MongoDB -- only `db push` is available.
- All Prisma MongoDB schema syntax is correct: `@id @default(auto()) @map("_id") @db.ObjectId` for IDs, `@db.ObjectId` on relation fields, `@updatedAt`, `@unique`.
- The `@blitzjs/rpc` APIs (`resolver.pipe`, `resolver.zod`, `resolver.authorize`, `useQuery`, `useMutation`) are all verified correct.
- `directConnection=true` is a valid MongoDB connection string parameter, commonly used in local development environments.
- `ctx.session.userId` and `import db from "db"` are both valid Blitz.js patterns.
