# Validation Summary: How to Use odbc() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ODBC (Open Database Connectivity)
- unixODBC driver manager
- PostgreSQL ODBC driver (psqlODBC)
- SQL

## Sources Consulted
- ClickHouse official documentation for the `odbc()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/odbc
- ClickHouse official documentation for the ODBC table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/odbc
- unixODBC documentation for `odbc.ini` and `odbcinst.ini` configuration
- psqlODBC driver documentation for DSN field names

## Issues Found

1. **Incorrect syntax: `odbc()` does not accept SQL queries as parameters.** The post originally showed `odbc('DSN=dsn_name', 'query')` as a valid syntax form and used it in multiple examples (passing full `SELECT` statements as the second argument). The `odbc()` table function only accepts table names, not arbitrary SQL queries. The valid forms are `odbc(datasource, database_or_schema, table)` and `odbc(datasource, table)`. Fixed the Basic Syntax section to show only the correct forms.

2. **"Query a Remote Table via ODBC" example used invalid query passthrough.** Changed `odbc('DSN=pg_prod', 'SELECT id, name, email FROM customers WHERE active = 1')` to `odbc('DSN=pg_prod', 'public', 'customers')` with the `WHERE active = 1` filter applied in the outer ClickHouse query.

3. **"Join ClickHouse with External ODBC Data" example used invalid query passthrough.** Changed the subquery wrapping `odbc('DSN=pg_prod', 'SELECT id, name FROM customers')` to a direct join on `odbc('DSN=pg_prod', 'public', 'customers')`.

4. **"Migrate Data from ODBC Source into ClickHouse" example used invalid query passthrough.** Changed `odbc('DSN=pg_prod', 'SELECT ... FROM orders WHERE created_at > ...')` to `odbc('DSN=pg_prod', 'public', 'orders')` with the `WHERE` clause applied in the outer ClickHouse query.

5. **"Testing Connectivity" example used invalid query passthrough.** Changed `odbc('DSN=pg_prod', 'SELECT 1 AS n')` to `odbc('DSN=pg_prod', 'public', 'customers')` since the `odbc()` function cannot execute arbitrary queries.

## Review Notes
- The post mentions "push-down WHERE clauses" in the summary. ClickHouse can push predicates down to the ODBC source in some cases, so this claim is directionally correct, though the original examples incorrectly demonstrated this by passing SQL queries directly to the function.
- The type mapping table is reasonable but could note that TIMESTAMP may map to DateTime64 depending on the precision of the source column. This is a minor nuance and not an error.
- The security note about `chmod 600 /etc/odbc.ini` is good advice in principle, but in practice the file must remain readable by the ClickHouse process user (typically `clickhouse`). Ownership or group permissions may need adjustment accordingly.
- The `odbc()` function also supports a `named_collection` form (single argument) for ClickHouse versions that support named collections, but omitting this is not an error.
