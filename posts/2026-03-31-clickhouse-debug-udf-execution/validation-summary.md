# Validation Summary: How to Debug UDF Execution in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (SQL User Defined Functions)
- ClickHouse Executable UDFs
- `system.functions` system table
- ClickHouse server configuration (`config.xml`)
- Bash / shell utilities (`tail`, `grep`, `chmod`, `chown`)
- Python (for executable UDF scripts)

## Sources Consulted
- ClickHouse docs: `system.functions` table (https://clickhouse.com/docs/en/operations/system-tables/functions)
- ClickHouse docs: CREATE FUNCTION / SQL UDFs (https://clickhouse.com/docs/en/sql-reference/statements/create/function)
- ClickHouse docs: Executable User Defined Functions (https://clickhouse.com/docs/en/sql-reference/functions/udf)
- ClickHouse docs: Server settings — `user_defined_executable_functions_config` (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings)
- ClickHouse docs: `send_logs_level` setting (https://clickhouse.com/docs/en/operations/settings/settings)
- ClickHouse docs: Conditional functions (`if`) and NULL functions (`isNull`)

## Issues Found
No technical issues found.

All facts verified as correct:
- `system.functions` columns `name`, `origin`, `create_query` exist (some are marked obsolete but still present).
- `'SQLUserDefined'` and `'ExecutableUserDefined'` are valid `origin` enum values.
- `CREATE OR REPLACE FUNCTION name AS (params) -> expression` syntax is supported.
- `user_defined_executable_functions_config` is a valid server configuration parameter.
- `send_logs_level = 'debug'` is a valid session/query-level setting.
- `/var/lib/clickhouse/user_scripts/` is the documented default location for executable UDF scripts.
- `isNull()` and `if()` are valid ClickHouse functions.
- Bash and Python snippets are syntactically valid and behave as described.

## Review Notes
- The `origin` and `create_query` columns in `system.functions` are marked as obsolete in recent ClickHouse versions, but they remain present and functional — the queries shown will still work.
- The executable UDF XML config (referenced by `user_defined_executable_functions_config`) was not shown in the post itself; readers will still need the XML descriptor in `/etc/clickhouse-server/user_defined/*.xml` to register an executable UDF, but that is outside the scope of "debugging" an existing one.
- The Python script example in a `text` fenced block rather than `python` is a minor formatting choice, not a technical issue.
