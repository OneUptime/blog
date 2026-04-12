# Validation Summary: How to Use MongoDB with KeystoneJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- KeystoneJS 6 (`@keystone-6/core`)
- PostgreSQL (corrected from MongoDB)
- Prisma (corrected from Mongoose)
- Node.js
- GraphQL
- TypeScript

## Sources Consulted
- KeystoneJS official documentation — Choosing a Database: https://keystonejs.com/docs/guides/choosing-a-database
- KeystoneJS system configuration docs: https://keystonejs.com/docs/config/config
- KeystoneJS getting started guide: https://keystonejs.com/docs/getting-started
- KeystoneJS getContext API docs: https://keystonejs.com/docs/context/get-context
- KeystoneJS document field docs: https://keystonejs.com/docs/fields/document
- KeystoneJS GitHub discussion on MongoDB support: https://github.com/keystonejs/keystone/discussions/7511
- create-keystone-app on npm: https://www.npmjs.com/package/create-keystone-app
- KeystoneJS GraphQL API docs: https://keystonejs.com/docs/apis/graphql

## Issues Found

### 1. Fundamental error: KeystoneJS 6 does not support MongoDB
- **What was wrong:** The entire post claimed that KeystoneJS 6 (`@keystone-6/core`) supports MongoDB. This is false. KeystoneJS 6 dropped MongoDB support when it migrated from Mongoose to Prisma as its data layer. Keystone 6 only supports PostgreSQL, MySQL, and SQLite.
- **What was changed:** Rewrote the post to use PostgreSQL instead of MongoDB. Updated the title, tags, description, and introductory text to reflect PostgreSQL as the database.
- **Why:** The `provider: 'mongodb'` config value does not exist in Keystone 6. Any code using this config would fail at startup.

### 2. Incorrect manual setup dependencies
- **What was wrong:** `npm install @keystone-6/core mongoose` — Keystone 6 does not use Mongoose; it uses Prisma.
- **What was changed:** Changed to `npm install @keystone-6/core @prisma/client` with `prisma` as a dev dependency.
- **Why:** Mongoose is a MongoDB ODM used by Keystone 5. Keystone 6 uses Prisma exclusively.

### 3. Incorrect scaffolding command
- **What was wrong:** `npm init keystone-app@latest my-cms` with a "Choose MongoDB when prompted" comment. The official command is `npm create keystone-app@latest`, and there is no MongoDB option in the prompts.
- **What was changed:** Changed to `npm create keystone-app@latest my-cms` and removed the MongoDB prompt comment.
- **Why:** While `npm init` can work as an alias, the official docs use `npm create`. The MongoDB prompt does not exist.

### 4. Invalid database configuration
- **What was wrong:** `db: { provider: 'mongodb', url: 'mongodb://localhost:27017/myapp' }` — `'mongodb'` is not a valid provider value.
- **What was changed:** Changed to `db: { provider: 'postgresql', url: 'postgresql://localhost:5432/myapp' }`.
- **Why:** Valid Keystone 6 providers are `'postgresql'`, `'mysql'`, and `'sqlite'` only.

### 5. Raw query section used Mongoose instead of Prisma
- **What was wrong:** The "Custom Query with Raw MongoDB" section used `mongoose.connection.db` to run raw MongoDB queries. This approach is incompatible with Keystone 6, which uses Prisma.
- **What was changed:** Rewrote the section to use `context.prisma` for direct Prisma queries. Fixed the `getContext` import to use the correct `* as PrismaModule from '.prisma/client'` pattern.
- **Why:** Keystone 6 exposes database access through `context.prisma`, not through Mongoose connections.

### 6. Incorrect getContext usage
- **What was wrong:** `getContext(config, PrismaClient)` — `PrismaClient` was used without being imported.
- **What was changed:** Changed to `getContext(config, PrismaModule)` with the correct `import * as PrismaModule from '.prisma/client'`.
- **Why:** The second argument to `getContext` must be the Prisma module, not an uninitialized class reference.

## Review Notes
- The list schema definition (fields, access control, relationships), GraphQL queries, and mutations were all correct for Keystone 6 and required no changes.
- The `@keystone-6/fields-document` import for the document field is correct.
- The GraphQL playground URL (`http://localhost:3000/api/graphql`) is correct for Keystone 6.
- Since this post is in a MongoDB blog series but the technology (Keystone 6) does not support MongoDB, the post's placement in the series may need reconsideration. The post is now technically correct but covers PostgreSQL with KeystoneJS rather than MongoDB.
