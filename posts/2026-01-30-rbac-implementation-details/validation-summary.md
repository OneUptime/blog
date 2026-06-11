# Validation Summary: How to Create RBAC Implementation Details

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Role-Based Access Control (RBAC) design patterns
- PostgreSQL (DDL, recursive CTEs, ON CONFLICT upserts, expression-based indexes)
- TypeScript (type definitions, async functions)
- Express.js (middleware factory pattern)
- ioredis (Redis client for caching)
- Vitest (testing framework)
- SCIM (System for Cross-domain Identity Management) for IdP sync
- Mermaid diagrams (flowchart, erDiagram, sequenceDiagram)

## Sources Consulted
- PostgreSQL CREATE TABLE documentation — https://www.postgresql.org/docs/current/sql-createtable.html (PRIMARY KEY grammar: `PRIMARY KEY ( column_name [, ... ] )` accepts only column names, not expressions)
- PostgreSQL INSERT / ON CONFLICT documentation — https://www.postgresql.org/docs/current/sql-insert.html (conflict_target grammar: `{ index_column_name | ( index_expression ) }` allows expression targets when backed by a matching expression-based unique index)
- PostgreSQL recursive CTE documentation — https://www.postgresql.org/docs/current/queries-with.html (validated the `WITH RECURSIVE role_hierarchy` pattern)
- Express.js middleware documentation — https://expressjs.com/en/guide/using-middleware.html (middleware factory + `next()` pattern is correct)
- ioredis API — https://github.com/redis/ioredis (validated `setex`, `get`, `keys`, `del(...keys)` usage)
- Vitest API — https://vitest.dev/api/ (validated `describe`, `it`, `expect`, `beforeEach`, `rejects.toThrow` usage)
- RFC 7644 (SCIM 2.0 Protocol) — verified the SCIM endpoint semantics shown in the sequence diagram (POST /Users, PATCH /Users/{id}, DELETE /Users/{id}, status codes 201/200/204)

## Issues Found

1. **Invalid PostgreSQL `PRIMARY KEY` with expression (`user_roles` table)** — The original schema declared `PRIMARY KEY (user_id, role_id, COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'))`. PostgreSQL's `PRIMARY KEY` grammar accepts only column names, not function calls or expressions, so this DDL would fail with a syntax error at `COALESCE`. **Fix:** Removed the inline `PRIMARY KEY` clause and added a separate `CREATE UNIQUE INDEX user_roles_unique_assignment ON user_roles (user_id, role_id, COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'::UUID));`. This is the standard PostgreSQL idiom for enforcing uniqueness across nullable columns and preserves the author's intent of treating a NULL resource_id (global scope) as a single distinct value. Also added the explicit `::UUID` cast on the sentinel so the COALESCE return type is unambiguous.

2. **`ON CONFLICT` target needed updating to match the new unique index** — Once the PRIMARY KEY was replaced with an expression-based unique index, the `ON CONFLICT (user_id, role_id, COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'))` clause in the `assignRole` upsert had to match the new index expression. **Fix:** Wrapped the expression element in parentheses per the documented `conflict_target` grammar (`( index_expression )`) and added the matching `::UUID` cast: `ON CONFLICT (user_id, role_id, (COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'::UUID)))`. This is now syntactically valid and references the new unique index.

## Review Notes

- **`redis.keys(...)` in `invalidateUserPermissionCache`** — Technically correct, but `KEYS` is documented by Redis as O(N) and should be avoided in production against large keyspaces. `SCAN` (or maintaining a per-user set of cache keys) is the recommended production pattern. Not changed because the post is presenting a basic illustration and the author may intentionally have chosen `KEYS` for simplicity; the code as-written does work.
- **`req.permissionContext = result;` in the Express middleware** — In strict TypeScript this would require module augmentation of `Express.Request` to compile, but the snippet is illustrative of the pattern and the same caveat applies to many real Express+TS codebases.
- **Section heading "Resource-Scoped Permissions" (around line 384)** — Missing its `##` markdown prefix so it renders as plain text rather than a heading. This is a formatting issue, not a technical error, so it was left unchanged per the review instructions.
- **Mermaid hierarchy diagram references permissions (`system:admin`, `billing:manage`, `comments:write`, etc.)** that are not inserted by the seed SQL. This is fine — the diagram is illustrative of the hierarchy concept rather than a 1:1 mirror of the seed data.
- **Recursive CTE depth guard (`WHERE rh.depth < 10`)** — Correctly placed in the recursive term, which is the right way to bound recursion in PostgreSQL.
