# Validation Summary: How to Drop Columns from a ClickHouse Table

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse
- SQL / DDL (ALTER TABLE)
- MergeTree engine family (MergeTree, ReplacingMergeTree, CollapsingMergeTree)
- `system.mutations`, `system.tables`

## Sources Consulted
- Official ClickHouse docs: [ALTER TABLE ... COLUMN](https://clickhouse.com/docs/en/sql-reference/statements/alter/column)
- Official ClickHouse docs: [Manipulating Partitions and Parts](https://clickhouse.com/docs/sql-reference/statements/alter/partition)
- Official ClickHouse docs source: [column.md](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/statements/alter/column.md)
- Altinity knowledge base: [How ALTERs work in ClickHouse](https://kb.altinity.com/altinity-kb-setup-and-maintenance/alters/)
- ClickHouse guide: [Updating and deleting ClickHouse data with mutations](https://clickhouse.com/docs/guides/developer/mutations)

## Issues Found

1. **Incorrect DROP COLUMN behavior description.** The intro and "Basic DROP COLUMN Syntax" sections claimed the column data is deleted asynchronously - "the data is not deleted instantly - it is removed the next time a merge touches each part, or when you explicitly trigger a mutation" and "The actual on-disk data is removed asynchronously via a mutation that rewrites affected parts." This is wrong. Per the official ClickHouse docs, DROP COLUMN "deletes data from the file system. Since this deletes entire files, the query is completed almost instantly." Because ClickHouse stores each column in separate files, dropping a column is essentially a metadata change plus file deletion, not a part-rewriting mutation. Rewrote the intro and the paragraph after the Basic DROP COLUMN Syntax example to state the correct behavior.

2. **Incorrect CLEAR COLUMN syntax.** The post contained this code block and claim: `ALTER TABLE events CLEAR COLUMN deprecated_field;` with the statement "Omitting `IN PARTITION` clears the column across all partitions". This is a syntax error: per the ClickHouse grammar, CLEAR COLUMN requires `IN PARTITION partition_expr`. Removed the invalid example and replaced it with an accurate note that `IN PARTITION` is required and guidance on iterating `system.parts` to clear every partition.

3. **Misleading "combine the underlying mutations" wording.** The "Dropping Multiple Columns" section said batched drops are more efficient because ClickHouse "can combine the underlying mutations." Since DROP COLUMN is not a data-rewriting mutation, this framing is inaccurate. Changed to: "Batching drops into one statement is more efficient because ClickHouse applies all the changes to the table metadata in a single operation."

4. **Misleading "Checking Mutation Progress" framing.** The section claimed `DROP COLUMN` and `CLEAR COLUMN` both "issue background mutations." Clarified that CLEAR COLUMN is the one that actually runs as a rewriting background mutation, while DROP COLUMN is near-instant (file deletes) but still appears in `system.mutations`. The rest of the section (the query against `system.mutations`, the `is_done` / `parts_to_do` completion criteria) is accurate and was left intact.

## Review Notes

- All remaining SQL (the `CREATE TABLE`, `INSERT`, `DESCRIBE TABLE`, `ON CLUSTER '{cluster}'` usage, and the `system.tables` query that filters by `engine LIKE '%MaterializedView%'`) is syntactically valid ClickHouse SQL.
- The caveats about ORDER BY / PARTITION BY / PRIMARY KEY columns and about ReplacingMergeTree version / CollapsingMergeTree sign columns are correct: ClickHouse refuses to drop columns that belong to those expressions.
- One thing worth noting for a future pass (not a correctness issue, so not changed): for Compact parts, DROP COLUMN can internally trigger a part rewrite rather than a simple file delete. The post's new wording ("typically completes almost instantly") accommodates this without getting into the weeds.
- The `'{cluster}'` macro reference in the `ON CLUSTER` example is the standard ClickHouse idiom and correctly relies on the `{cluster}` macro defined in server config.
