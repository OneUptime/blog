# Validation Summary: How to Use Merge Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Merge table engine
- MergeTree table engine
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation — Merge table engine: https://clickhouse.com/docs/en/engines/table-engines/special/merge
- ClickHouse official documentation — CREATE TABLE syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/table

## Issues Found
1. **Missing column definitions in CREATE TABLE for Merge table (two instances)**
   - **What was wrong:** Both `CREATE TABLE events_all` statements had no column list and no `AS <existing_table>` clause. ClickHouse requires either explicit columns or an `AS` clause to define the schema when creating a table — even for the Merge engine, which does not store data. Without this, the CREATE TABLE statement would fail.
   - **First instance (Creating a Merge Table section):** Added explicit column definitions `(event_date Date, user_id UInt64, event_name String)` to match the underlying table schemas used later in the post.
   - **Second instance (Schema Requirements section):** Changed to `CREATE TABLE events_all AS events_2024 ENGINE = Merge(...)` to inherit the schema from the already-defined `events_2024` table, which is a documented pattern shown in the official ClickHouse docs.
   - **Why:** The official documentation examples always show either explicit columns or an `AS` clause. A bare `CREATE TABLE <name> ENGINE = Merge(...)` is not valid syntax.

## Review Notes
- The post does not mention that the Merge engine is read-only (INSERT is not supported). This is not an error but could be a useful addition for readers who might attempt writes.
- The claim about WHERE clause pushdown to underlying tables is generally accurate in practice (MergeTree index pruning still applies), though the official Merge engine docs only explicitly document pushdown for the `_table` virtual column filter.
- The post also does not mention the `_database` virtual column, which is available alongside `_table`. This is not an error, just an omission of an additional feature.
- All SQL query examples are syntactically correct ClickHouse SQL and would work as described.
