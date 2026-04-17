# Validation Summary: How to Build Dynamic Queries Safely in ClickHouse

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- ClickHouse
- clickhouse-driver (Python)
- ClickHouse HTTP interface
- ClickHouse parameterized queries (typed parameters: `String`, `Identifier`)
- SQL injection prevention patterns (allowlists)

## Sources Consulted
- ClickHouse HTTP Interface documentation: https://clickhouse.com/docs/en/interfaces/http (parameter passing via `param_<name>` URL parameter)
- ClickHouse SQL syntax documentation: https://clickhouse.com/docs/en/sql-reference/syntax (`Identifier` type for parameterizing identifiers such as table/column names)
- clickhouse-driver Python client: uses `%(name)s` pyformat parameter style with a dict of params (standard for the library)

## Issues Found
- **Incorrect HTTP parameter naming in curl example.** The original example used `&col=country&uid=abc`, but ClickHouse's HTTP interface requires the `param_` prefix for query parameter substitution (e.g., `param_col=country`, `param_uid=abc`). Using unprefixed names would cause ClickHouse to treat them as settings/unknown keys and the `{col:Identifier}` / `{uid:String}` placeholders would fail to resolve. Fixed the curl line to use `&param_col=country&param_uid=abc`.

## Review Notes
- The `Identifier` parameter type is indeed available in modern ClickHouse versions (documented in current ClickHouse docs). The author's note that it is "available in newer ClickHouse versions" is appropriately cautious.
- The clickhouse-driver `%(name)s` named parameter style is correct. Note that clickhouse-driver performs client-side substitution rather than true server-side parameter binding; the escaping is safe but differs semantically from HTTP-interface parameters. This is a nuance worth mentioning in a future revision but does not make the examples incorrect.
- The allowlist patterns for columns and sort directions are idiomatic and sound. Using `', '.join(safe_cols) or '*'` correctly handles the empty-list case.
- Minor stylistic note (not fixed, not an error): the `allowed_filters` dict maps names to type strings that are never used; a `set` would suffice. Kept as-is since it's not technically wrong and may be intentional for future extension.
