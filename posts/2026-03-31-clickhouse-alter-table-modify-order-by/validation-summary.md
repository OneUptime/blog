# Validation Summary: How to Use ALTER TABLE MODIFY ORDER BY in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (MergeTree table engine)
- SQL DDL (ALTER TABLE, MODIFY ORDER BY, ADD COLUMN, OPTIMIZE)
- ClickHouse system tables (`system.tables`)
- Data types referenced: `LowCardinality(String)`

## Sources Consulted
- Official ClickHouse docs — ALTER TABLE ... MODIFY ORDER BY: https://clickhouse.com/docs/en/sql-reference/statements/alter/order-by
- Official ClickHouse docs — ALTER TABLE index: https://clickhouse.com/docs/en/sql-reference/statements/alter/
- Official ClickHouse docs — ALTER TABLE Column operations: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- Raw docs source: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/docs/en/sql-reference/statements/alter/order-by.md

## Issues Found

1. **Constraint #1 was backwards (critical).** The original post stated: "New key columns must already exist in the table. You cannot add a column and modify the ORDER BY in a single statement; add the column first." The official ClickHouse docs state the exact opposite: "you cannot add expressions containing existing columns to the sorting key (only columns added by the `ADD COLUMN` command in the same `ALTER` query, without default column value)." I rewrote constraint #1 to match the documented rule and explained the underlying reason (preserving the sorted-data invariant without rewriting existing parts).

2. **Workflow example violated the documented rule.** The original workflow added a column with `DEFAULT 'unknown'` in one ALTER, then extended ORDER BY in a separate ALTER. Per the docs, this is invalid because (a) the column would be an "existing column" by the time the second statement runs and (b) the new column must not have a default value. I rewrote the example as a single combined ALTER without a default value.

3. **"When to Use" example had the same two-statement / default-value issue.** Fixed to use a single combined ALTER with no default on `service_name`.

4. **`ALTER TABLE ... MODIFY PRIMARY KEY` is not a documented ClickHouse command.** The original post included an example using this syntax. The official ALTER TABLE reference does not list `MODIFY PRIMARY KEY` among the supported modifiers, and the Column reference explicitly states there is no support for changing the primary key structure via ALTER — changes require recreating the table. I removed the example and replaced it with a note about the correct procedure (new table + `INSERT SELECT` + `RENAME`).

5. **Summary wording updated** to reflect the corrected constraint (new columns must be created in the same `ALTER` query without a default value) rather than the previous incorrect phrasing.

6. **Nullable clarification.** Added a parenthetical noting that the `allow_nullable_key` setting can relax the Nullable restriction — this is a well-known escape hatch in ClickHouse.

## Review Notes

- The sort-key-only-extensible constraint (constraint #2) is consistent with how `MODIFY ORDER BY` is generally used. While the docs do not state this in so many words, the inability to add existing columns and the metadata-only nature of the operation together imply that you cannot remove or reorder leading columns without breaking the sort invariant on existing parts.
- The documented constraint (only new, no-default columns can be added) is stricter than what some users may have experienced in practice. Behavior may vary slightly across ClickHouse versions, but the docs are the authoritative reference and the post should align with them.
- `OPTIMIZE TABLE ... FINAL` is correctly characterized as resource-intensive and best avoided in production for large tables.
- The `system.tables` columns referenced (`sorting_key`, `primary_key`, `engine`, `name`) are correct.
- `LowCardinality(String)` used in the examples is a valid and commonly used type for low-cardinality string columns in ClickHouse.
