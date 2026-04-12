# Validation Summary: How to Use MySQL with Drizzle ORM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Drizzle ORM (drizzle-orm)
- drizzle-kit (migration tooling)
- mysql2 (Node.js MySQL driver)
- TypeScript
- Node.js

## Sources Consulted
- Drizzle ORM official documentation — https://orm.drizzle.team/docs/get-started/mysql-new
- Drizzle ORM MySQL column types — https://orm.drizzle.team/docs/column-types/mysql
- Drizzle ORM indexes and constraints — https://orm.drizzle.team/docs/indexes-constraints
- drizzle-kit configuration reference — https://orm.drizzle.team/docs/drizzle-config-file
- drizzle-kit CLI commands — https://orm.drizzle.team/docs/drizzle-kit-generate, https://orm.drizzle.team/docs/drizzle-kit-push
- Drizzle ORM transactions — https://orm.drizzle.team/docs/transactions
- Drizzle ORM insert API for MySQL — https://orm.drizzle.team/docs/insert

## Issues Found

1. **drizzle-kit config used deprecated API**: The config used `import type { Config } from 'drizzle-kit'` with `driver: 'mysql2'` and `satisfies Config`. Updated to `import { defineConfig } from 'drizzle-kit'` with `dialect: 'mysql'` and `defineConfig()` wrapper, which is the current API since drizzle-kit v0.21.0.

2. **CLI commands were outdated**: `npx drizzle-kit generate:mysql` and `npx drizzle-kit push:mysql` used the deprecated colon-suffixed syntax. Updated to `npx drizzle-kit generate` and `npx drizzle-kit push` (dialect is now specified in the config file).

3. **Index definition used deprecated object syntax**: The third argument to `mysqlTable` returned an object `(table) => ({ key: index(...) })`. Updated to the current array syntax `(table) => [index(...)]` introduced in drizzle-orm v0.30.0.

4. **Transaction example had multiple errors**: (a) Referenced an `orders` table that was never defined in the schema section. (b) Used `const [order] = await tx.insert(orders).values(...)` which incorrectly implied MySQL inserts return rows — MySQL does not support RETURNING, and Drizzle's MySQL insert returns `MySqlRawQueryResult` (ResultSetHeader), not inserted rows. (c) Used the `sql` template tag without importing it. Fixed by rewriting to use the defined `products` table, removing the incorrect return value destructuring, and adding the `sql` import from `drizzle-orm`.

5. **Decimal column comparison used wrong type**: `lte(products.price, 1000)` passed a number where Drizzle's `decimal()` column maps to `string` in TypeScript. Changed to `lte(products.price, '1000')` for type correctness.

## Review Notes
- The connection setup examples correctly show both single connection and pool-based approaches. The pool example is appropriately labeled as recommended for production.
- The schema definition section is well-structured and demonstrates foreign keys, default values, and various column types correctly.
- The query examples (select with join, insert, update, delete) are all correct and demonstrate good Drizzle patterns.
- If the author wants to show returning the inserted ID from a MySQL insert in a future update, Drizzle provides `.$returningId()` for this purpose.
