# Validation Summary: How to Create UDFs in ClickHouse with Executable Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Executable User-Defined Functions)
- Python (UDF script implementation)
- XML (function configuration format)
- SQL (function invocation)

## Sources Consulted
- [ClickHouse UDF documentation](https://clickhouse.com/docs/sql-reference/functions/udf)
- [ClickHouse system.functions table documentation](https://clickhouse.com/docs/operations/system-tables/functions)
- [ClickHouse CREATE FUNCTION documentation](https://clickhouse.com/docs/sql-reference/statements/create/function)

## Issues Found
- **Incorrect `CREATE FUNCTION` example for executable UDFs.** The original post stated "Or define via SQL in ClickHouse 22.6+:" and provided a `CREATE FUNCTION classify_sentiment AS (text) -> (...)` snippet implying it could register the executable script. This is incorrect: ClickHouse's `CREATE FUNCTION` statement only supports SQL/lambda expressions and cannot reference an external executable. Executable UDFs must be registered via XML/YAML configuration files. Replaced the misleading example with a clarifying note.

## Review Notes
- The XML configuration filename `user_defined_functions.xml` works as long as it matches the `user_defined_executable_functions_config` server setting (default pattern is `*_function.xml`), but this is configurable so the example is acceptable.
- The `<name>` field inside `<argument>` is optional — it is only strictly required when the chosen `<format>` (e.g., Native, JSONEachRow) serializes argument names. For TabSeparated it is not required, but its inclusion is harmless and improves readability.
- The `executable_pool` default `pool_size` of 16 matches official documentation.
- The `system.functions.origin` column values `ExecutableUserDefined` and `SQLUserDefined` are correct; note that the column is marked as obsolete in newer ClickHouse versions but still functional for introspection.
- The `<command>sentiment.py</command>` value is resolved relative to `user_scripts_path` (default `/var/lib/clickhouse/user_scripts/`) when `execute_direct` is `1` (the default), which matches the post's setup.
