# Validation Summary: How to Use Lightweight UPDATE in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse lightweight UPDATE (patch parts)
- ClickHouse ALTER TABLE ... UPDATE (mutations)
- ClickHouse system.mutations table
- ReplacingMergeTree

## Sources Consulted
- [The Lightweight UPDATE Statement | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/update)
- [How we built fast UPDATEs — Part 2: SQL-style UPDATEs](https://clickhouse.com/blog/updates-in-clickhouse-2-sql-style-updates)
- [How we made ClickHouse UPDATEs 1,000x faster (Part 3: Benchmarks)](https://clickhouse.com/blog/updates-in-clickhouse-3-benchmarks)
- [Updates in ClickHouse Overview | ClickHouse Docs](https://clickhouse.com/docs/updating-data/overview)
- [system.mutations | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/mutations)
- [ALTER TABLE ... UPDATE | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/alter/update)

## Issues Found

1. **Wrong setting name for lightweight UPDATE**: The post used `SET apply_mutations_on_fly = 1;` which is the setting for on-the-fly mutations (a different feature that makes ALTER TABLE mutations visible immediately during SELECT). The correct setting for the standalone `UPDATE` DML syntax is `SET allow_experimental_lightweight_update = 1;`. Fixed.

2. **Missing required table-level settings**: Lightweight UPDATE requires the table to have `enable_block_number_column = 1` and `enable_block_offset_column = 1` enabled. Added these to the post.

3. **Misleading claim about mutations**: The post stated "Since updates still create mutations internally" when introducing the system.mutations monitoring section. Lightweight UPDATE uses patch parts, not traditional mutations. Reworded to clarify this section applies to ALTER TABLE mutations specifically.

4. **Inaccurate summary**: The summary stated lightweight UPDATE works "while still using mutations under the hood." Lightweight UPDATE uses patch parts (compact delta files), not full mutation rewrites. Corrected to "using patch parts rather than full mutation rewrites."

## Review Notes
- The lightweight UPDATE feature (`allow_experimental_lightweight_update`) is experimental as of ClickHouse 25.7+. The post does not mention the experimental status, which readers should be aware of before using in production.
- The `apply_mutations_on_fly` setting is a real and useful feature, but it applies to `ALTER TABLE ... UPDATE` mutations (making them visible before background rewrite completes), not to the standalone `UPDATE` DML syntax. A future post could cover on-the-fly mutations as a separate topic.
- The `system.mutations` query and `mutations_sync` setting examples are correct for ALTER TABLE mutations.
