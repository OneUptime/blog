# Validation Summary: What Is the Difference Between Mutations and Lightweight Deletes in ClickHouse

## Status
validated

## Post Type
Guide / Technical comparison

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse mutations (`ALTER TABLE UPDATE/DELETE`)
- ClickHouse lightweight deletes (`DELETE FROM`)
- `system.mutations` system table
- ReplacingMergeTree engine
- `OPTIMIZE TABLE FINAL`

## Sources Consulted
- ClickHouse official documentation on mutations: https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse official documentation on lightweight deletes: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse `system.mutations` table documentation: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse 22.8 release notes (lightweight delete introduction)
- ClickHouse 23.3 release notes (lightweight delete enabled by default)

## Issues Found

1. **Non-existent column `parts_to_do_count` in `system.mutations` query** — The second query for checking mutation status referenced `parts_to_do_count`, which is not a column in the `system.mutations` table. The correct column is `parts_to_do` (Int64), which was already included in the same SELECT list. Removed the non-existent `parts_to_do_count` column from the query.

2. **Missing version context for `allow_experimental_lightweight_delete` setting** — The post instructed readers to enable `allow_experimental_lightweight_delete = 1` without noting that this setting defaults to enabled starting from ClickHouse 23.3. Added a clarifying note that the explicit setting is only required on versions before 23.3.

## Review Notes

- The description of mutations "rewriting all columns" in step 2 of the mutation process is a common simplification. In practice, for `ALTER TABLE UPDATE` on specific columns, ClickHouse uses hardlinks for unchanged columns and only rewrites the modified column files. For `ALTER TABLE DELETE`, all column files are rewritten. The post's characterization is consistent with how the ClickHouse documentation describes mutation cost at a high level, so this was left as-is.
- The `apply_deleted_mask = 0` setting referenced in the lightweight delete checking section is a per-query setting for bypassing the deletion mask. This was introduced alongside lightweight deletes and is less commonly documented than other settings.
- Limitation #3 ("on plain MergeTree, lightweight deletes convert to mutations") is slightly misleading — lightweight deletes always use the mutation mechanism internally (they translate to `ALTER TABLE UPDATE _row_exists = 0 WHERE ...`). The practical difference on plain MergeTree vs ReplicatedMergeTree is about synchronization behavior. The statement is directionally correct for the audience level.
- The `KILL MUTATION` example uses `mutation_123.txt` as a mutation ID. In practice, ClickHouse mutation IDs are typically zero-padded numbers like `0000000006.txt`. The example is illustrative and works for teaching purposes.
- All SQL syntax for `ALTER TABLE UPDATE/DELETE`, `DELETE FROM`, `OPTIMIZE TABLE FINAL`, `ReplacingMergeTree` DDL, and `system.mutations` queries is correct.
- The ReplacingMergeTree anti-pattern example is well-chosen and technically accurate.
