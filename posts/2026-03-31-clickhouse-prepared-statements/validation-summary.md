# Validation Summary: How to Use Prepared Statements in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server-side parameterized queries, HTTP interface)
- Python clickhouse-driver library
- @clickhouse/client Node.js library
- curl / HTTP API

## Sources Consulted
- ClickHouse official docs — Query Parameters / Stored Procedures: https://clickhouse.com/docs/guides/developer/stored-procedures-and-prepared-statements
- ClickHouse official docs — SQL Syntax (query parameters section): https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse official docs — HTTP Interface: https://clickhouse.com/docs/interfaces/http
- ClickHouse JS Client docs: https://clickhouse.com/docs/integrations/javascript
- clickhouse-driver Python docs: https://clickhouse-driver.readthedocs.io/en/latest/features.html
- ClickHouse GitHub Issue #38235 — Native protocol parameter support: https://github.com/ClickHouse/ClickHouse/issues/38235
- ClickHouse GitHub Issue #93812 — RFC for query plan caching (confirms no plan caching exists): https://github.com/clickhouse/clickhouse/issues/93812

## Issues Found

1. **Incorrect claim: "query plan reuse"** — The introduction stated that client libraries provide "query plan reuse." ClickHouse does not cache or reuse query plans (confirmed by RFC #93812 which proposes adding this as a new feature). Removed this claim from the introduction.

2. **Misleading claim: parameterization is purely client-side** — The "Server-Side vs Client-Side Preparation" section stated that "ClickHouse performs parameterization on the client side - the driver substitutes typed values before sending the query." This is incorrect for the `{name:Type}` syntax, which is server-side parameterization — the server receives the query template and parameter values separately. Rewrote the section to accurately distinguish between server-side `{name:Type}` parameterization and client-side `%(name)s` substitution in clickhouse-driver.

3. **Unused variable in Python example** — The Python example defined a `query` variable that was never used; the `client.execute()` call used a hardcoded string literal instead. Removed the unused variable to avoid confusion.

## Review Notes
- The `%(id)s` syntax shown in the "When to Use Query Settings" section is client-side parameter substitution (the driver escapes and inlines values before sending), while the `{name:Type}` syntax used in the HTTP and Node.js examples is server-side. The post now explains this distinction in the intro section, but the per-example sections don't call it out individually. A future improvement could add a brief note to each example clarifying which mechanism is being used.
- The Node.js `@clickhouse/client` example and HTTP interface example are both correct and use current API conventions.
- The batch insert pattern shown is correct and is indeed the recommended approach for high-throughput inserts with clickhouse-driver.
