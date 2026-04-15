# Validation Summary: How ClickHouse MVCC Works for Concurrent Access

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- ClickHouse (MergeTree engine family)
- MVCC / Concurrency control concepts
- ClickHouse system tables (system.parts)
- ClickHouse replication and deduplication

## Sources Consulted
- ClickHouse Architecture Overview (academic_overview): https://clickhouse.com/docs/academic_overview
- ClickHouse system.parts documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse Transactional (ACID) support: https://clickhouse.com/docs/guides/developer/transactional
- ClickHouse Deduplicating inserts on retries: https://clickhouse.com/docs/guides/developer/deduplicating-inserts-on-retries
- ClickHouse SYSTEM Statements: https://clickhouse.com/docs/sql-reference/statements/system

## Issues Found

1. **Inaccurate framing of ClickHouse's concurrency model**: The post originally stated ClickHouse "does not use MVCC in the traditional sense" without acknowledging that ClickHouse's own documentation describes its model as "snapshot isolation realized by an MVCC variant based on versioned parts." Updated the opening to accurately describe ClickHouse as using an MVCC variant based on immutable, versioned data parts (not row-level MVCC).

2. **Incorrect claim about snapshot isolation**: The "Limitations" section originally stated "there is no 'transaction start' snapshot in standard MergeTree." This is inaccurate — each SELECT query runs against a consistent snapshot of parts taken at query start. The actual limitation is that there is no cross-statement snapshot isolation outside of experimental transactions. Updated to clarify that per-query snapshot isolation exists, and noted that experimental multi-statement transactions are available via `allow_experimental_transactions` and ClickHouse Keeper.

3. **Oversimplified INSERT atomicity**: The post originally claimed "all rows land in one part or none do" without qualification. This is only true when the INSERT targets a single partition and fits within one block. If an INSERT spans multiple partitions, each partition's part is atomic independently, but the INSERT as a whole is not atomic across partitions. Large inserts exceeding `max_insert_block_size` are split into multiple blocks with per-block atomicity. Added these caveats.

4. **Summary section was inaccurate**: The summary stated ClickHouse "does not support multi-statement transactions or snapshot isolation across long-running reads." Updated to reflect that per-query snapshot isolation exists and experimental transaction support is available.

## Review Notes
- The `system.parts` query, `SYSTEM SYNC REPLICA` command, and deduplication explanation are all technically correct.
- The post could mention that deduplication has a limited window (default 100 blocks for `replicated_deduplication_window`) and that users can override content-based hashing with `insert_deduplication_token`, but these are optional enhancements rather than errors.
- The `SYSTEM SYNC REPLICA` command only works for ReplicatedMergeTree tables, which the post does not explicitly state — a minor omission that does not rise to the level of an error given the context.
