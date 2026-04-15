# Validation Summary: How to Optimize DISTINCT Queries in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse
- ClickHouse aggregate functions (uniq, uniqExact, uniqCombined)
- ClickHouse aggregate function combinators (-State, -Merge)
- AggregatingMergeTree engine
- Materialized views

## Sources Consulted
- ClickHouse `count` function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- ClickHouse `uniq` function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse `uniqExact` function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse `uniqCombined` function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse DISTINCT clause documentation — https://clickhouse.com/docs/sql-reference/statements/select/distinct
- ClickHouse aggregate function combinators documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse definitive query optimization guide — https://clickhouse.com/resources/engineering/clickhouse-query-optimisation-definitive-guide

## Issues Found

1. **`uniq` error rate imprecise**: The post stated "2% error" for the `uniq` function. ClickHouse documentation states the error rate is "1-2%". Changed to "1-2% error" for accuracy.

2. **`uniq` speed claim understated**: The post stated "10x faster". ClickHouse's own optimization guide characterizes approximate counting as "10-100x faster" than exact counting. Updated to "10-100x faster".

3. **`COUNT(DISTINCT)` mapping incomplete**: The post stated `COUNT(DISTINCT col)` "internally calls `uniqExact`" without noting this is the default behavior controlled by the `count_distinct_implementation` setting. Added clarification that this is the default and is configurable.

4. **`uniqCombined` example did not demonstrate tunability**: The post described `uniqCombined` as providing "tunable precision" but the code example `uniqCombined(user_id)` used default precision. Changed to `uniqCombined(12)(user_id)` with a comment explaining the HLL_precision parameter (range 12-20, default 17).

5. **GROUP BY vs DISTINCT claim unsupported and potentially misleading**: The post claimed "GROUP BY often outperforms DISTINCT because ClickHouse can optimize it better." ClickHouse documentation actually notes that DISTINCT can stream results and terminate early with LIMIT (without ORDER BY), which is an advantage over GROUP BY. Rewrote the section to recommend GROUP BY when aggregations are needed alongside deduplication, and noted that DISTINCT has its own streaming advantages.

6. **DISTINCT + LIMIT early termination caveat missing**: The post correctly stated that ClickHouse stops processing once enough distinct values are found with LIMIT, but omitted the critical caveat that this only works when ORDER BY is omitted. Added this caveat.

## Review Notes
- The AggregatingMergeTree materialized view pattern with -State/-Merge combinators is fully correct and follows the canonical ClickHouse pattern.
- The `count_distinct_implementation` setting is a useful optimization lever that could merit its own section in a future revision, as changing it globally to `uniq` can speed up all COUNT(DISTINCT) queries without rewriting them.
