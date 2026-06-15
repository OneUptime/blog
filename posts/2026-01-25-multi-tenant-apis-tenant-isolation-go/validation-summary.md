# Validation Summary: How to Design Multi-Tenant APIs with Tenant Isolation in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go net/http middleware
- Go database/sql
- PostgreSQL Row-Level Security
- PostgreSQL transaction-local settings
- Token-bucket rate limiting

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go database/sql package documentation: https://pkg.go.dev/database/sql
- Go database querying guide: https://go.dev/doc/database/querying
- Go language specification, predeclared functions and Go 1.21 changes: https://go.dev/ref/spec
- PostgreSQL Row Security Policies documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL CREATE POLICY documentation: https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL SET documentation: https://www.postgresql.org/docs/current/sql-set.html
- PostgreSQL system administration functions, including current_setting and set_config: https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found
- The `TenantStore` interface used by the middleware snippet was not defined. Added a minimal interface so the example shows the expected contract.
- `extractFromSubdomain` did not handle `Host` values containing a port. Updated the helper to strip the port with `net.SplitHostPort` before splitting the hostname.
- The repository wrapper claimed to add tenant filtering through a CTE, but `GetByID` bypassed the wrapper and referenced `tenant_scope` without adding the CTE. Reworked the wrapper to pass `tenant_id` as the first query argument and updated repository methods to use it consistently.
- The `List` method did not check `rows.Err()` after iteration. Added the standard post-iteration error check.
- The RLS example used `SET LOCAL` through `ExecContext` with a bind parameter and described it as request-scoped. PostgreSQL documents `SET LOCAL` as transaction-scoped, so the example now starts a transaction and uses `set_config('app.current_tenant_id', $1, true)`.
- The RLS policy used `current_setting('app.current_tenant_id')`, which errors if the setting is missing. Updated it to `current_setting('app.current_tenant_id', true)`, which returns null when unset and therefore denies rows instead of failing unexpectedly.
- The token-bucket limiter reset `lastCheck` on every request, which could prevent token refill under continuous traffic. Updated refill logic to advance `lastCheck` only by completed intervals.
- The rate limiter used the predeclared `min` function, which is only available in Go 1.21 and newer. Replaced it with an explicit cap to keep the snippet compatible with older supported Go versions.

## Review Notes
The snippets are still illustrative and assume application-local types such as `User`, `GetTenant`, and repository construction exist in the surrounding codebase. For production RLS usage, all tenant-scoped queries must run on the returned transaction or another connection with the tenant setting established for that transaction.
