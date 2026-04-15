# Validation Summary: How to Build a Replay-Safe Ingestion Pipeline for ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (ReplacingMergeTree, AggregatingMergeTree, insert_deduplicate, FINAL modifier)
- SQL (DDL, DML, materialized views, aggregate function combinators)
- Python (clickhouse-connect client)
- ClickHouse HTTP interface (curl-based inserts and queries)

## Sources Consulted
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse deduplicating inserts guide: https://clickhouse.com/docs/guides/developer/deduplicating-inserts-on-retries
- ClickHouse MergeTreeSettings source (replicated_deduplication_window, non_replicated_deduplication_window defaults): https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/MergeTreeSettings.cpp
- ClickHouse argMax aggregate function: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- ClickHouse aggregate function combinators (-State, -Merge): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse toUnixTimestamp64Milli source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/toUnixTimestamp64Milli.cpp
- clickhouse-connect Python driver API: https://clickhouse.com/docs/integrations/language-clients/python/driver-api

## Issues Found

1. **Strategy 1 - "primary key" vs "sorting key"**: The post stated ReplacingMergeTree deduplicates rows with the same "primary key." ClickHouse documentation explicitly states it deduplicates by the "sorting key" (ORDER BY), not the primary key. In ClickHouse, PRIMARY KEY can be a prefix of ORDER BY, making this distinction important. Changed to "sorting key (`ORDER BY`)."

2. **Strategy 2 - incorrect deduplication window default**: The comment claimed "Default deduplication window is 100 blocks." This is outdated. The current default for `replicated_deduplication_window` is 10,000 blocks (not 100). Additionally, for non-replicated MergeTree tables, `non_replicated_deduplication_window` defaults to 0 (disabled), meaning insert deduplication does not work out of the box for non-replicated tables. Updated the comment to reflect the correct defaults and the replicated vs. non-replicated distinction.

3. **Strategy 4 - inaccurate description**: The text said "Create a materialized view that counts distinct events per ID" but the view uses `argMaxState` to track the latest timestamp and payload per event_id, not to count anything. Changed to "tracks the latest event data per ID."

## Review Notes
- The `_version` column is defined as `UInt64` but `toUnixTimestamp64Milli()` returns `Int64`. ClickHouse handles this via implicit casting and it works correctly for positive timestamps, so this is not a functional issue but is a minor type mismatch.
- The Python code in Strategy 3 is pseudocode illustrating the offset-tracking pattern. The `client.insert('events', new_messages)` call assumes `new_messages` is a list of dicts, but `clickhouse-connect`'s `insert()` method actually expects a sequence of sequences (list of lists/tuples), not dicts. As pseudocode demonstrating the concept, this is acceptable, but readers implementing it would need to adapt the data format.
- The post correctly uses `FINAL` in all ReplacingMergeTree queries, which is important since deduplication only happens during background merges otherwise. The testing section also correctly uses `FINAL`, making the expected result of 1 accurate.
- The `argMaxState(ts, ts)` usage in Strategy 4 is valid but equivalent to `maxState(ts)` since both arguments are the same column. It works correctly but could be simplified.
