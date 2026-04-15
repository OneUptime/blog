# Validation Summary: How to Write a ClickHouse Query Kill Script for Long Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system tables, SQL statements, HTTP interface)
- Bash scripting
- curl (HTTP client)
- ClickHouse `KILL QUERY` and `KILL MUTATION` statements
- ClickHouse `system.processes` table
- ClickHouse `ALTER USER` settings management

## Sources Consulted
- ClickHouse system.processes documentation: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse KILL QUERY/MUTATION documentation: https://clickhouse.com/docs/en/sql-reference/statements/kill
- ClickHouse ALTER USER documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse formatReadableSize function documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse output formats documentation: https://clickhouse.com/docs/en/interfaces/formats

## Issues Found
No technical issues found.

## Review Notes
- The script uses `-u user:password` for HTTP Basic Auth with curl. This works correctly in practice, though ClickHouse's official docs more commonly show URL-embedded credentials (`http://user:password@host:port/`) or custom headers (`X-ClickHouse-User`/`X-ClickHouse-Key`). The `-u` flag is a valid and widely understood curl convention, so this is not an error.
- The `KILL MUTATION` example correctly omits the `SYNC` keyword, which is important because `KILL MUTATION` only supports the `TEST` modifier, not `SYNC` or `ASYNC` (unlike `KILL QUERY`).
- The script interpolates shell variables directly into SQL strings, which is acceptable for an admin-operated script but would be a concern in a multi-tenant or user-facing context. This is appropriate for the tutorial's scope.
