# Validation Summary: How to Implement Multi-Tenancy in Node.js Applications

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Node.js
- Express.js
- NestJS
- PostgreSQL
- Row-Level Security
- node-postgres (`pg`)
- Redis caching patterns
- AsyncLocalStorage

## Sources Consulted
- PostgreSQL Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL CREATE POLICY: https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL SET and configuration settings: https://www.postgresql.org/docs/current/sql-set.html
- PostgreSQL `current_setting` and `set_config`: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL GRANT and sequence privileges: https://www.postgresql.org/docs/current/sql-grant.html
- node-postgres Pool API: https://node-postgres.com/apis/pool
- node-postgres parameterized queries: https://node-postgres.com/features/queries
- Node.js AsyncLocalStorage API: https://nodejs.org/api/async_context.html
- Express middleware guide: https://expressjs.com/en/guide/using-middleware/
- NestJS middleware documentation: https://docs.nestjs.com/middleware
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/

## Issues Found
- The Row-Level Security setup snippet was fenced as JavaScript and wrapped the SQL in a block comment, so the "Run this SQL" instructions would not actually execute. Changed the snippet to a `sql` fence and made the comments SQL comments.
- The RLS setup created `app_user` without `LOGIN`, but the surrounding Node.js examples expect the application to connect with that role. Changed it to `CREATE ROLE app_user LOGIN`.
- The RLS setup granted table privileges but did not grant usage on the `users_id_seq` sequence created by `SERIAL`, which would cause inserts that rely on the sequence to fail for `app_user`. Added `GRANT USAGE ON SEQUENCE users_id_seq TO app_user`.
- The RLS setup omitted schema usage for the application role. Added `GRANT USAGE ON SCHEMA public TO app_user` so the role can access objects in the public schema.
- The Node.js and NestJS examples used `SET LOCAL app.current_tenant = $1`. Replaced this with `SELECT set_config('app.current_tenant', $1, true)`, which is the PostgreSQL function form intended for parameterized transaction-local settings.
- The Express example imported sibling example modules with `./middleware/...` and `./row-level-security/...` from inside `express-example/app.js`, which did not match the directory layout shown by the snippets. Updated those imports to `../middleware/...` and `../row-level-security/...`.
- The Redis cache example used `KEYS` for application-level tenant cache clearing. Redis documents `KEYS` as unsuitable for regular application code, so the example now uses cursor-based `SCAN` with `MATCH` and `COUNT`.

## Review Notes
- The RLS examples assume the application connects as a non-owner role without `BYPASSRLS`; PostgreSQL table owners and superusers can bypass RLS unless `FORCE ROW LEVEL SECURITY` is used.
- The examples are intentionally illustrative and omit production concerns such as tenant identifier normalization, host/subdomain edge cases, credential management, migration orchestration, and Redis client-specific scan helper APIs.
