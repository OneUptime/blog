# Validation Summary: How to Implement Idempotent Data Ingestion in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, ReplacingMergeTree, MergeTree)
- ClickHouse settings (`insert_deduplication_token`, `replicated_deduplication_window`)
- SQL (DDL/DML for ClickHouse)
- Apache Kafka (consumer offset management)
- Python (clickhouse-driver / kafka consumer pseudocode)

## Sources Consulted
- ClickHouse source code for default settings: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Storages/MergeTree/MergeTreeSettings.cpp
- ClickHouse source code for `insert_deduplication_token`: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Core/Settings.cpp
- ClickHouse docs: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication

## Issues Found
- The post stated that `replicated_deduplication_window` has a default of 100 blocks. The current default in the ClickHouse source (`MergeTreeSettings.cpp`) is `10000`. Fixed by updating the value to `10000` and additionally surfacing the companion time-based setting `replicated_deduplication_window_seconds` (default one hour) so readers do not assume the window is purely block-count limited.

## Review Notes
- `ReplicatedMergeTree` block-level deduplication claim is correct: blocks are hashed and duplicates within the window are ignored. ClickHouse Keeper stores these hash sums.
- `insert_deduplication_token` behavior is correctly described — when non-empty it overrides content-based hashing, and the same token on retry skips the insert. Note (not fixed, as the post's statement is still accurate): deduplication works at partition level per official docs.
- `ReplacingMergeTree(version)` correctly keeps the row with the highest version for rows sharing the `ORDER BY` key. The `FINAL` example is valid, though readers should be aware that `FINAL` can be expensive; this is a performance caveat rather than a correctness issue.
- The staging-table pattern using `CREATE TABLE events_staging AS events ENGINE = MergeTree() ORDER BY event_id` is valid ClickHouse syntax — the `AS <other_table>` copies the column structure, and an explicit `ENGINE`/`ORDER BY` overrides the source engine.
- The Python Kafka pseudocode uses `clickhouse-driver`-style `client.execute("INSERT INTO events VALUES", rows)` and `kafka-python`-style `consumer.poll(timeout_ms=1000)`. The pattern of committing offsets only after a successful insert is correct for achieving at-least-once delivery that becomes effectively exactly-once thanks to ClickHouse block deduplication. The snippet is illustrative and does not handle the case where `kafka-python`'s `poll` returns a dict keyed by `TopicPartition`, but this is acceptable as pseudocode.
- Version caveat: the `replicated_deduplication_window` default has changed over ClickHouse's history (older versions used 100). The value stated now matches current ClickHouse master.
