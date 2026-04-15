# Validation Summary: How to Write Your First ClickHouse UDF

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL UDFs and Executable UDFs)
- SQL (CREATE FUNCTION, DROP FUNCTION, lambda expressions)
- Python (executable UDF script example)
- XML (ClickHouse executable UDF configuration)

## Sources Consulted
- ClickHouse official documentation: CREATE FUNCTION statement (https://clickhouse.com/docs/en/sql-reference/statements/create/function)
- ClickHouse official documentation: UDFs overview (https://clickhouse.com/docs/en/sql-reference/functions/udf)
- ClickHouse official documentation: system.functions table (https://clickhouse.com/docs/en/operations/system-tables/functions)
- ClickHouse official documentation: Executable UDFs (https://clickhouse.com/docs/en/engines/table-functions/executable)

## Issues Found
No technical issues found.

## Review Notes
- The `create_query` column in `system.functions` (used in the "Listing and Dropping UDFs" section) is marked as **Obsolete** in current ClickHouse documentation. The query still works today, but readers should be aware this column may be removed in a future ClickHouse version.
- The `DROP FUNCTION` example could optionally use `IF EXISTS` for robustness, but the syntax as written is correct.
- The executable UDF config path `/etc/clickhouse-server/user_defined/` is correct for default installations; the actual path is controlled by the `user_defined_executable_functions_config` setting, which the post does not mention but is not required for a beginner tutorial.
