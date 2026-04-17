# Validation Summary: ClickHouse for BigQuery Users - Key Differences

## Status
validated

## Post Type
Guide / Comparison reference

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, query cache)
- Google BigQuery (Standard SQL, on-demand pricing, streaming API, query result cache)
- Data warehousing / columnar analytics concepts (partitioning, clustering, array handling)

## Sources Consulted
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery cached query results: https://cloud.google.com/bigquery/docs/cached-results
- BigQuery date/time functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions and /date_functions
- BigQuery DDL (PARTITION BY / CLUSTER BY): https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery UNNEST: https://cloud.google.com/bigquery/docs/reference/standard-sql/arrays
- ClickHouse MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse date functions (toStartOfHour, dateDiff): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse arrayJoin: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse query cache: https://clickhouse.com/docs/en/operations/query-cache

## Issues Found
1. **Outdated BigQuery pricing.** The post stated "approximately $5/TB" and derived $500/day / $15,000/month. BigQuery on-demand pricing was updated to $6.25/TiB in July 2023. Updated the figure to $6.25/TiB and recalculated the monthly example to $625/day and roughly $18,750/month.
2. **Incorrect claim about BigQuery query caching.** The post stated "BigQuery charges for every query scan regardless of whether results were cached recently." Per Google's official docs, BigQuery has an automatic query result cache and does *not* charge for queries served from that cache (though it invalidates on underlying table changes). Rewrote the section heading ("Query Result Caching") and opening sentence to reflect that BigQuery does have free caching but with invalidation caveats, preserving the original comparison with ClickHouse's explicit configurable cache.

## Review Notes
- SQL dialect examples (TIMESTAMP_TRUNC, DATE_DIFF, toStartOfHour, dateDiff argument order) are correct. ClickHouse's `dateDiff('day', start, end)` returns `end - start`, matching BigQuery's `DATE_DIFF(end, start, DAY)`.
- BigQuery `CREATE TABLE ... PARTITION BY DATE(event_time) CLUSTER BY ...` and ClickHouse MergeTree DDL are valid.
- BigQuery `UNNEST` and ClickHouse `arrayJoin` equivalence is accurate.
- ClickHouse query cache settings (`use_query_cache`, `query_cache_ttl`) are valid; docs commonly use `= true` instead of `= 1`, but both are accepted boolean forms, so no change made.
- Cost comparisons are inherently workload-dependent; the post's framing ("for continuous high-frequency workloads") is appropriately hedged.
