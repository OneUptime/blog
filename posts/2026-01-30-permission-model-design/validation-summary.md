# Validation Summary: How to Build Permission Model Design

## Status
validated

## Post Type
Tutorial / Guide — walks through designing and implementing an RBAC permission model with SQL schema, TypeScript authorization service, Express middleware integration, role hierarchy, and cache invalidation.

## Technologies Covered
- PostgreSQL (SQL schema, `gen_random_uuid()`, foreign keys, indexes)
- TypeScript (interfaces, classes, async/await, discriminated unions)
- Express.js (route middleware pattern)
- Redis-style cache abstraction (`get`/`set`/`deletePattern`)
- Mermaid diagrams (architectural visualization)
- Access control concepts: RBAC, ABAC, ReBAC

## Sources Consulted
- PostgreSQL `CREATE TABLE` documentation — table constraints syntax: https://www.postgresql.org/docs/current/sql-createtable.html (confirms PRIMARY KEY only accepts column names, not expressions)
- PostgreSQL `CREATE INDEX` documentation — expression indexes: https://www.postgresql.org/docs/current/sql-createindex.html (only UNIQUE INDEX permits expressions like `COALESCE`)
- PostgreSQL `gen_random_uuid()` — available natively in PostgreSQL 13+: https://www.postgresql.org/docs/current/functions-uuid.html
- Express.js middleware documentation: https://expressjs.com/en/guide/using-middleware.html
- node-postgres (`pg`) result format with `.rows`: https://node-postgres.com/apis/result
- NIST RBAC model concepts and role hierarchy theory
- Authorization patterns: Zanzibar paper (ReBAC), NIST SP 800-162 (ABAC)

## Issues Found
1. **Invalid PostgreSQL PRIMARY KEY syntax in `user_roles` table.** The original schema used `PRIMARY KEY (user_id, role_id, COALESCE(resource_id, '00000000-0000-0000-0000-000000000000'))`. PostgreSQL does not allow expressions (function calls like `COALESCE`) inside a `PRIMARY KEY` or table-level `UNIQUE` constraint — only column names are permitted. Running this DDL would fail with a syntax error. **Fix:** introduced a surrogate `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` and moved the COALESCE-based uniqueness guarantee into a separate `CREATE UNIQUE INDEX`, which is where PostgreSQL does permit expressions. Added a brief inline comment explaining the rationale so the technique is reusable.

2. **Authorization query ignored `ur.resource_type`, allowing cross-resource-type leakage.** The schema explicitly documents that `user_roles.resource_type` of `NULL` means a global assignment and a non-NULL value scopes the role to that resource type. The original SQL only checked `p.resource_type` and `ur.resource_id`, never `ur.resource_type`. A role assigned for `('document', X)` would have incorrectly granted permission against `('project', X)` if the UUIDs happened to match, and more broadly the scoping intent of `resource_type` in `user_roles` was unenforced. **Fix:** updated the WHERE clause so a row matches only when `ur.resource_type IS NULL` (truly global) OR `ur.resource_type` equals the requested resource type (with the existing NULL-or-equal check on `resource_id`).

## Review Notes
- The `req.params.id` value in the Express middleware is typed `string | undefined`; passing it through to `canPerform` as `resourceId` is fine because the interface marks it optional, and the cache-key builder already handles the undefined case via `|| 'all'`.
- `gen_random_uuid()` is a PostgreSQL 13+ built-in. On older versions it requires `CREATE EXTENSION pgcrypto;` — worth noting if readers target legacy PostgreSQL deployments, but not strictly an error since the post does not pin a version.
- The `cache.deletePattern('perm:*')` API is not a native Redis command; in real Redis deployments it is typically implemented via `SCAN` + `DEL` (or `UNLINK`). Using `KEYS` on a large keyspace is discouraged in production. The post abstracts this behind a custom cache interface, which is reasonable for illustration.
- The role-hierarchy `getEffectiveRoles` flattens only one level since `roleHierarchy['owner']` already lists `['admin', 'editor', 'viewer']` directly. This works for the configured hierarchy but would not transitively resolve a hierarchy defined only as `owner: ['admin']`, `admin: ['editor']`, etc. Acceptable as written; readers extending the example should be aware.
- The Mermaid `graph BT` direction in the role-hierarchy diagram is consistent: lower roles at the bottom flow upward into higher roles, matching the cumulative permission labels (`viewer: read`, `editor: read, write`, `admin: read, write, manage`, `owner: all permissions`).
- Cache TTL of 60 seconds combined with event-driven invalidation is a sensible default; under high-churn role assignments, readers may want to lower it further or use write-through invalidation.
