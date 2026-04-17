# Validation Summary: How to Create a Function (UDF) in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse SQL UDFs (lambda-based)
- ClickHouse executable UDFs (XML config + external scripts)
- ClickHouse `executable_pool` UDF type
- ClickHouse `system.functions` system table
- Python (used for executable UDF script example)
- ClickHouse SQL functions: `multiIf`, `if`, `concat`, `substring`, `position`, `extract`, `round`

## Sources Consulted
- ClickHouse `CREATE FUNCTION` docs: https://clickhouse.com/docs/sql-reference/statements/create/function
- ClickHouse `DROP FUNCTION` docs: https://clickhouse.com/docs/sql-reference/statements/drop
- ClickHouse `SHOW` statement docs: https://clickhouse.com/docs/sql-reference/statements/show
- ClickHouse User-Defined Functions (executable) docs: https://clickhouse.com/docs/sql-reference/functions/udf
- ClickHouse `system.functions` docs: https://clickhouse.com/docs/operations/system-tables/functions
- ClickHouse string-search functions: https://clickhouse.com/docs/sql-reference/functions/string-search-functions

## Issues Found
1. **`SHOW CREATE FUNCTION` does not exist in ClickHouse.** The post had `SHOW CREATE FUNCTION celsius_to_fahrenheit;`, but ClickHouse's `SHOW CREATE` only supports TABLE, DICTIONARY, VIEW, DATABASE, USER, ROLE, ROW POLICY, QUOTA, SETTINGS PROFILE, and MASKING POLICY — not FUNCTION. Replaced with a query against `system.functions` (`SELECT create_query FROM system.functions WHERE name = 'celsius_to_fahrenheit';`), which is the supported way to retrieve a UDF definition.

## Review Notes
- The `system.functions.origin` and `create_query` columns are marked "Obsolete" in the current ClickHouse documentation. They still work today and are the canonical way to inspect SQL UDFs, but readers should be aware they may be removed or renamed in a future release.
- The XML config path used in the comment (`/etc/clickhouse-server/user_defined_functions/sentiment.xml`) is a valid custom location; ClickHouse's typical convention is `/etc/clickhouse-server/*_function.xml`, with the lookup path controlled by the `user_defined_executable_functions_config` setting. Either is fine as long as the configuration matches.
- The default `user_scripts_path` is `/var/lib/clickhouse/user_scripts/`. The post uses an absolute path (`/opt/udfs/sentiment.py`) in the `<command>` tag, which works regardless of `user_scripts_path`, so no change was needed.
- All SQL functions used (`multiIf`, `if`, `concat`, `substring`, `position`, `extract`, `round`, `toFloat64`) are correct, with proper argument order. The `extract(haystack, pattern)` returns the first capture group, which yields `clickhouse.com` as the post claims.
- Default values noted in docs for `executable_pool`: `pool_size` defaults to 16, `max_command_execution_time` defaults to 10 seconds — both parameters used in the post are valid.
