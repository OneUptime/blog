# Validation Summary: How to Connect Bun to PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun (JavaScript runtime)
- PostgreSQL
- `pg` (node-postgres) driver
- `postgres` (postgres.js) driver
- dbmate (database migration tool)
- Drizzle ORM
- Prisma ORM
- TypeScript

## Sources Consulted
- node-postgres Pool docs: https://node-postgres.com/apis/pool
- node-postgres Client docs: https://node-postgres.com/apis/client
- postgres.js (porsager/postgres) README: https://github.com/porsager/postgres
- Drizzle ORM PostgreSQL column types: https://orm.drizzle.team/docs/column-types/pg
- PostgreSQL error codes appendix: https://www.postgresql.org/docs/current/errcodes-appendix.html
- Bun docs (SQL/runtime): https://bun.sh/docs/runtime/sql
- dbmate README: https://github.com/amacneil/dbmate

## Issues Found
1. **Drizzle schema used `serial` for a foreign key column.** In the `posts` table, `authorId: serial("author_id").references(() => users.id)` would create an auto-incrementing sequence for the FK column, which is incorrect — a foreign key column should match the referenced column's underlying type without its own sequence. Changed to `integer("author_id").references(() => users.id)` and added `integer` to the imports from `drizzle-orm/pg-core`.

2. **Incorrect reference to a non-existent `sql.identifier()` method.** The comment above the dynamic identifier example read "use `sql.identifier()`", but postgres.js does not expose such a method — dynamic identifiers are quoted by calling the tag function as a regular function, i.e. `sql(columnName)`, which the code itself was already doing. Updated the comment to accurately describe the API ("call `sql()` as a function with the identifier").

## Review Notes
- All `pg` Pool option names (`max`, `idleTimeoutMillis`, `connectionTimeoutMillis`) and units (ms) are correct.
- All postgres.js pool option names (`max`, `idle_timeout`, `connect_timeout`, `max_lifetime`) and units (seconds) are correct. Worth noting that the unit difference between the two libraries is a common source of bugs, but the post's values are internally consistent.
- PostgreSQL error codes cited (23505, 23503, 23502) all map to the correct conditions (`unique_violation`, `foreign_key_violation`, `not_null_violation`).
- `sql.begin(async (tx) => …)` API in postgres.js and `tx.unsafe(content)` usage for raw SQL execution inside a transaction are correct.
- dbmate commands (`brew install dbmate`, `dbmate new`, `dbmate up/down/status`) and the `-- migrate:up` / `-- migrate:down` migration file format are correct.
- The post does not mention Bun's native built-in PostgreSQL client (`import { sql } from "bun"`), introduced in Bun 1.2 and generalized in Bun 1.2.21 (August 2025). This is not an error since the post explicitly focuses on third-party drivers (`pg` and `postgres.js`), but a future revision could note Bun's native option as a third alternative.
- `process.env.DATABASE_URL` is passed directly to `postgres()` without a non-null assertion or fallback in several examples. Under strict TypeScript settings this would surface as a type error, but it works at runtime when the env var is set. Not a correctness bug.
