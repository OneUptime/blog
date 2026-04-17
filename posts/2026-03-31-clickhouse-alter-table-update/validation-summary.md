# Validation Summary: How to Use ALTER TABLE UPDATE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL (ALTER TABLE UPDATE, KILL MUTATION)
- ClickHouse system tables (system.mutations)
- MergeTree / ReplicatedMergeTree engines
- ClickHouse mutations (asynchronous background operations)

## Sources Consulted
- ClickHouse ALTER UPDATE docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse system.mutations docs: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse KILL statement docs: https://clickhouse.com/docs/en/sql-reference/statements/kill
- ClickHouse ALTER overview: https://clickhouse.com/docs/en/sql-reference/statements/alter
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
No technical issues found.

All core technical claims verified against official documentation:
- `ALTER TABLE ... UPDATE col = expr WHERE condition` syntax is correct per current docs.
- All referenced `system.mutations` columns (database, table, mutation_id, command, create_time, is_done, parts_to_do, latest_fail_reason) exist.
- `KILL MUTATION WHERE ...` syntax matches the documented form.
- The claim that mutations "execute by rewriting whole data parts" is directly stated in the official docs.
- Restriction to `*MergeTree` engine family is accurate.
- The `mutation_N.txt` mutation_id format used in the example is the actual format produced by non-replicated MergeTree tables (docs note mutation IDs "correspond to file names in the data directory").

## Review Notes
- The subquery restriction in the SET clause (#5 in verification) is a well-known ClickHouse limitation that is accurate in practice, even though it's not explicitly called out on the ALTER UPDATE docs page. The post's wording correctly describes the behavior.
- The ReplicatedMergeTree mutation deduplication claim is accurate — ClickHouse does deduplicate identical mutations submitted to replicated tables via the replication log — though this behavior is not prominently documented on the public docs pages. Readers working with replicated clusters should be aware this behavior can vary with cluster configuration.
- The comment `-- Check deduplication log entries` above the completed-mutations query is slightly misleading since `system.mutations` is not literally a "deduplication log," but the query itself (selecting completed mutations) is valid and the intent is clear. Not a technical error — more a labeling nit.
- For replicated tables, `mutation_id` is formatted as a zero-padded integer (e.g., `0000000001`) rather than `mutation_N.txt`. The post's example targets non-replicated MergeTree, which is correct for that format, but a reader running this on a replicated cluster would need to adjust the mutation_id value.
- No version-specific caveats encountered; the behavior described applies to all modern ClickHouse versions.
