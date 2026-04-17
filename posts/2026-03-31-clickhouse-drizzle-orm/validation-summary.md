# Validation Summary: How to Use ClickHouse with Drizzle ORM

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse (MySQL-compatible interface on port 9004)
- Drizzle ORM (`drizzle-orm/mysql2`)
- `mysql2` Node.js driver
- `@clickhouse/client` (official ClickHouse JS client)
- TypeScript

## Sources Consulted
- ClickHouse MySQL Interface docs: https://clickhouse.com/docs/en/interfaces/mysql
- Drizzle ORM MySQL getting started: https://orm.drizzle.team/docs/get-started-mysql
- Drizzle ORM overview / supported databases: https://orm.drizzle.team/docs/overview
- Official ClickHouse JS client docs: https://clickhouse.com/docs/integrations/javascript
- Drizzle ClickHouse support discussion: https://github.com/drizzle-team/drizzle-orm/discussions/1252

## Issues Found
No technical issues found.

Verified claims:
- ClickHouse exposes a MySQL-compatible interface; port 9004 is the documented example value (configurable via `mysql_port`).
- Drizzle ORM has no native ClickHouse driver — confirmed by the official "supported dialects" list (PostgreSQL, MySQL, SQLite, SingleStore) and an open community discussion requesting ClickHouse support.
- `@clickhouse/client` `createClient({ url: ... })` is the current API (the `url` parameter, defaulting to `http://localhost:8123`).
- `client.query({ query, query_params, format })` parameter names match the official reference.
- `client.insert({ table, values, format: 'JSONEachRow' })` matches the documented insert signature.
- `await client.close()` is the correct shutdown method (node-only).
- `mysql2` `createPool(...)` and `await pool.end()` are accurate.
- Drizzle `mysqlTable` / `bigint` / `varchar` / `timestamp` imports from `drizzle-orm/mysql-core` and the `sql` template literal usage (e.g. `sql<number>`count()``) are correct.

## Review Notes
- ClickHouse's MySQL interface has documented caveats (no prepared queries, some types returned as strings, potential SSL/SNI issues, double-SHA1 password requirement for broad compatibility). The post already steers the reader toward the native client for analytics — a reasonable mitigation — but readers running against ClickHouse Cloud or over TLS should consult the interface limitations page.
- Drizzle's `mysql-core` schema is used for query building only here; it is not suitable for running migrations against ClickHouse since ClickHouse DDL (engines, `ORDER BY`, partitioning, `DateTime` vs MySQL `TIMESTAMP`) differs significantly. The post doesn't claim otherwise, but migration via `drizzle-kit` against ClickHouse would not work and is appropriately absent.
- For a future revision, the Drizzle team's Waddler project (https://waddler.drizzle.team/docs/clickhouse) now offers a ClickHouse-native option using `@clickhouse/client` — worth mentioning as an alternative to the MySQL-interface workaround.
