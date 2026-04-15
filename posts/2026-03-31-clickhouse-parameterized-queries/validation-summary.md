# Validation Summary: How to Use Parameterized Queries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (HTTP interface, native protocol, query cache)
- Python (`clickhouse-driver` library)
- Go (`clickhouse-go` v2 library)
- SQL parameterized queries

## Sources Consulted
- ClickHouse HTTP Interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse Query Parameterization documentation: https://clickhouse.com/docs/en/sql-reference/syntax#defining-and-using-query-parameters
- ClickHouse Query Cache documentation: https://clickhouse.com/docs/en/operations/query-cache
- clickhouse-driver (Python) documentation: https://clickhouse-driver.readthedocs.io/en/latest/
- clickhouse-go v2 examples and documentation: https://github.com/ClickHouse/clickhouse-go

## Issues Found

1. **HTTP parameter prefix missing (`param_`)**: The original curl example used `&user_id=abc123` in the query string, but ClickHouse requires the `param_` prefix for HTTP parameters (i.e., `&param_user_id=abc123`). Without the prefix, the parameter value would not be bound to the query placeholder. Fixed the curl command and added an explanatory note.

2. **Query cache description was incorrect**: The post claimed parameterized queries "allow ClickHouse to reuse cached query plans" and "reduce parse overhead." ClickHouse's query cache stores **query results** (not query plans), keyed by the query's AST. Rewrote the section to accurately describe the cache mechanism and clarify the actual benefit of parameterized queries for cache behavior (consistent query structure avoids cache pollution from string-concatenated variants).

3. **Go client example used wrong parameter syntax**: The original example used `?` positional placeholders with direct arguments to `conn.Query()`. The official clickhouse-go v2 library uses `{name:Type}` placeholders with named parameters passed via `clickhouse.Context()` and `clickhouse.WithParameters()`. Rewrote the Go example to use the correct API.

4. **Supported parameter types list was incomplete**: The original list included only 14 scalar types, presented as if exhaustive. ClickHouse supports complex types (`Array(...)`, `Map(...)`, `Tuple(...)`) and the special `Identifier` type for parameterizing database/table/column names. Added these to the list with an explanatory note.

5. **"Named Parameters" section text was inaccurate**: The original text stated "For the native protocol, use positional `?` or named `%(name)s`" which conflated client-side binding syntax with server-side parameterized queries. Corrected to clarify that `{name:Type}` is the server-side syntax, and client libraries may offer their own binding mechanisms.

## Review Notes
- The Python `clickhouse-driver` example using `%(name)s` syntax is correct and verified against the library's documentation. This is client-side parameter substitution, distinct from ClickHouse's server-side `{name:Type}` parameterized queries.
- The SQL injection example is accurate and effectively illustrates the risk.
- The `{name:Type}` syntax in the SQL query example (lines 77-87) is correct ClickHouse server-side parameter syntax.
