# Validation Summary: How to Add Column with MATERIALIZED Expression in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (DDL, ALTER TABLE, MergeTree engine)
- SQL
- MATERIALIZED columns and MATERIALIZE COLUMN mutations
- ClickHouse system tables (`system.mutations`)
- ClickHouse functions: `toDate`, `toHour`, `lower`, `cityHash64`, `concat`
- ClickHouse settings: `asterisk_include_materialized_columns`

## Sources Consulted
- ClickHouse ALTER Column documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse settings documentation: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse `system.mutations` system table documentation
- ClickHouse MergeTree table engine documentation

## Issues Found
- **Incorrect claim about existing rows before MATERIALIZE COLUMN.** The post originally stated: *"Existing rows will have the default value for the type (0 for numeric, empty string, etc.) until you run `MATERIALIZE COLUMN`."* This is technically incorrect. Per the ClickHouse documentation, when a MATERIALIZED column is added via `ALTER TABLE ADD COLUMN`, existing rows do not receive zero/empty defaults — instead, the MATERIALIZED expression is evaluated on-the-fly at query time for parts that don't yet have the column physically stored. Running `MATERIALIZE COLUMN` then writes those computed values to disk. I updated the sentence to: *"Adding a MATERIALIZED column via `ALTER TABLE` only physically writes the column for new inserts. For existing rows, ClickHouse evaluates the expression on-the-fly at query time (which can be slower on large tables) until you run `MATERIALIZE COLUMN` to write the computed values to disk."*

## Review Notes
- All SQL syntax (`ALTER TABLE ... ADD COLUMN ... MATERIALIZED expr`, `MATERIALIZE COLUMN col IN PARTITION 'x'`, `ADD INDEX ... TYPE minmax GRANULARITY 1`, `DateTime64(3)`, `LowCardinality(String)`) is valid ClickHouse DDL.
- ClickHouse built-in functions referenced (`toDate`, `toHour`, `lower`, `cityHash64`, `concat`) are all current and correct.
- The `system.mutations` columns used (`mutation_id`, `command`, `is_done`, `parts_to_do`, `latest_fail_reason`, `create_time`, `table`) are valid fields of that system table.
- The `asterisk_include_materialized_columns` setting is correctly documented and its behavior described in the post matches the official docs.
- Minor nuance not corrected: the sentence *"ClickHouse will reject or ignore it depending on settings"* about INSERTs is slightly imprecise — with the default (`insert_allow_materialized_columns = 0`) ClickHouse rejects with an error, and with `insert_allow_materialized_columns = 1` it actually uses the user-supplied value rather than "ignoring" it. The practical takeaway in the post (don't supply values for MATERIALIZED columns) remains correct, so no edit was made to avoid introducing scope creep.
- The post does not call out ClickHouse version requirements (`MATERIALIZE COLUMN` was added in 20.6+; `asterisk_include_materialized_columns` in 22.1+). A version note could be a useful future improvement but is not required for correctness.
