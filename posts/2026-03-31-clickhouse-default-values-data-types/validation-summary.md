# Validation Summary: How to Use Default Values for Data Types in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- MergeTree table engine
- Column default expression types: DEFAULT, MATERIALIZED, ALIAS

## Sources Consulted
- ClickHouse official documentation — CREATE TABLE default values: https://clickhouse.com/docs/en/sql-reference/statements/create/table#default_values
- ClickHouse server settings reference (`asterisk_include_materialized_columns`, `asterisk_include_alias_columns`)
- ClickHouse data types reference (Int, Float, String, FixedString, Date, DateTime, UUID, Array, Nullable default values)
- ClickHouse functions reference (`now()`, `toDate()`, `toHour()`, `toMinute()`)

## Issues Found
1. **Incorrect claim about `SELECT * EXCEPT` including materialized columns.** The original text said: "To include materialized columns in SELECT *, you must list them explicitly or use `SELECT * EXCEPT(visit_date, visit_hour)` - they are excluded from wildcard results by default." This is logically reversed: `SELECT * EXCEPT` *excludes* listed columns from the wildcard, it does not include materialized ones. The correct mechanism in ClickHouse is the session setting `asterisk_include_materialized_columns = 1`. Fixed by rewriting the sentence to explain exclusion-by-default and to reference the correct setting.

## Review Notes
- Zero-value defaults listed for each type (Int/UInt, Float, String, FixedString, Date, DateTime, UUID, Array, Nullable) match the ClickHouse documentation.
- Syntax for `CREATE TABLE ... DEFAULT`, `MATERIALIZED`, and `ALIAS` is correct.
- `ALTER TABLE ... MODIFY COLUMN ... DEFAULT` syntax is correct; existing rows do retain their stored values.
- The post omits the `EPHEMERAL` column modifier (available since ClickHouse 22.5+), but this is a scope choice, not an error — the intro explicitly frames the post around four behaviors (type default, DEFAULT, MATERIALIZED, ALIAS).
- By default, inserting into a `MATERIALIZED` column raises an error; the setting `insert_allow_materialized_columns = 1` allows it, but the post's default-behavior claim is accurate.
- Claim that `ALIAS` columns cannot be used in `ORDER BY` or `PRIMARY KEY` and do not appear in `SELECT *` is accurate.
