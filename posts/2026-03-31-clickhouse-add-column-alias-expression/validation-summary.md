# Validation Summary: How to Add Column with ALIAS Expression in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse DDL: ALTER TABLE, ADD COLUMN, MODIFY COLUMN, RENAME COLUMN)
- ClickHouse column modifiers: ALIAS, MATERIALIZED, DEFAULT
- ClickHouse system tables (`system.columns`)
- ClickHouse settings (`asterisk_include_alias_columns`)

## Sources Consulted
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse CREATE TABLE — Column defaults (ALIAS / MATERIALIZED / DEFAULT): https://clickhouse.com/docs/en/sql-reference/statements/create/table#default_values
- ClickHouse `asterisk_include_alias_columns` setting: https://clickhouse.com/docs/en/operations/settings/settings#asterisk_include_alias_columns
- ClickHouse `system.columns` reference: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse String functions (`extract`, `concat`): https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions

## Issues Found
- **Incorrect removal syntax for ALIAS modifier.** The "Modifying an ALIAS Expression" section originally claimed that `ALTER TABLE events MODIFY COLUMN duration_s Float64;` would remove the alias default. This is inaccurate: per ClickHouse docs, `MODIFY COLUMN` only replaces properties that are explicitly specified in the clause — omitting the `ALIAS` clause leaves the existing alias expression untouched. The correct way to remove an alias default is `ALTER TABLE events MODIFY COLUMN duration_s REMOVE ALIAS;`. Fixed the example to use `REMOVE ALIAS`.

## Review Notes
- All other DDL examples (ADD COLUMN ... ALIAS, CREATE TABLE with ALIAS, MODIFY COLUMN ... ALIAS for changing an expression, RENAME COLUMN + ALIAS for backward compatibility) match current ClickHouse syntax.
- The comparison table for DEFAULT/MATERIALIZED/ALIAS accurately describes on-disk storage, INSERT supply behavior, and query-time cost.
- The statement that ALIAS columns cannot be used in the table's `ORDER BY` or `PARTITION BY` clauses is correct — these must be deterministic and resolvable from stored data.
- `asterisk_include_alias_columns` is a real, documented ClickHouse setting and toggles whether ALIAS columns appear in `SELECT *`.
- The `system.columns` query uses correct column names (`default_kind`, `default_expression`); `ALIAS` is a valid `default_kind` value.
- String functions used in examples (`extract`, `concat`, `toDate`) are all current ClickHouse built-ins.
- No version-specific caveats identified; examples work on recent ClickHouse releases.
