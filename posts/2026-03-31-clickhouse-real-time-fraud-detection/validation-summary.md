# Validation Summary: How to Build a Real-Time Fraud Detection System with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, ReplacingMergeTree engines)
- ClickHouse Materialized Views with aggregate state combinators (-State/-Merge)
- ClickHouse Kafka Engine (architecture reference)
- SQL (CTEs, self-joins, aggregate functions, conditional aggregates)

## Sources Consulted
- ClickHouse documentation on AggregateFunction type and -State/-Merge combinators: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse documentation on AggregatingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on ReplacingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse documentation on mutations (ALTER TABLE UPDATE): https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse documentation on lightweight deletes: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse documentation on DateTime64 type: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation on LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation on Decimal type: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse documentation on dateDiff function: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation on countIf/avgIf combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if

## Issues Found
1. **Misleading description of retroactive fraud labeling approach**: The text described the `ALTER TABLE ... UPDATE` mutation as "a lightweight delete plus insert pattern." This is incorrect — `ALTER TABLE ... UPDATE` is a mutation, not a lightweight delete. Lightweight deletes use `DELETE FROM` syntax (available since ClickHouse 22.8). Changed the text to accurately say "update the label using a mutation."

2. **Incorrect terminology in conclusion**: The conclusion stated "Window function queries detect behavioral patterns" but the post does not use SQL window functions (no `OVER()`/`PARTITION BY` clauses). The post uses self-joins and aggregate queries instead. Changed to "Self-join and aggregation queries detect behavioral patterns."

## Review Notes
- All SQL syntax is valid for modern ClickHouse versions (22.x+). The aggregate state combinator pattern (`countState`/`countMerge`, `sumState`/`sumMerge`, `uniqState`/`uniqMerge`) is correctly and consistently applied throughout.
- The `groupArray(DISTINCT account_id)` syntax in the device fingerprint query is valid in ClickHouse 21.x+. The more traditional ClickHouse idiom would be `groupUniqArray(account_id)`, but both are correct.
- The architecture appropriately positions ClickHouse as an analytical layer rather than a system of record, which is an important caveat for fraud detection systems.
- The velocity check query uses `toStartOfHour(now() - INTERVAL 1 HOUR)` which rounds down to the start of the previous hour, potentially including slightly more than 1 hour of data. This is a standard trade-off for bucketed aggregation and is acceptable.
