# Validation Summary: How to Build Real-Time User Activity Feeds with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, LowCardinality, partition pruning, sparse primary index)
- SQL (CREATE TABLE, SELECT, GROUP BY, INTERVAL, aggregate functions)

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse date-time functions docs: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse LowCardinality docs: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse INTERVAL data type docs: https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval
- ClickHouse custom partitioning key docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse choosing a partitioning key best practices: https://clickhouse.com/docs/best-practices/choosing-a-partitioning-key

## Issues Found
- **Incorrect partition pruning claim (line 47):** The post stated "ClickHouse reads only the relevant partition and the sparse index aligns with `actor_id`" for the personal feed query (`WHERE actor_id = 1001`). This is wrong because partition pruning requires a filter on the partition key expression (`ts` / `toYYYYMMDD(ts)`), but the personal feed query only filters on `actor_id`. The query is fast because the sparse primary index on `(actor_id, ts)` lets ClickHouse skip irrelevant granules — not because of partition pruning. Fixed the sentence to accurately describe the sparse primary index behavior.

## Review Notes
- All SQL syntax is correct: `CREATE TABLE`, `MergeTree()` with empty parentheses, `toYYYYMMDD()`, `LowCardinality(String)`, `DateTime DEFAULT now()`, `INTERVAL N UNIT`, `count()`, `uniq()`, `today()`, and `now()` are all valid ClickHouse syntax.
- The other queries in the post (follower feed, activity counts, trending objects) do filter on `ts` and would correctly benefit from partition pruning, though the post does not explicitly claim partition pruning for those queries.
- Daily partitioning via `toYYYYMMDD(ts)` is a valid choice but could produce many partitions over time. Monthly partitioning (`toYYYYMM`) is sometimes recommended for high-volume tables to reduce partition count, but this is a design trade-off rather than a correctness issue.
