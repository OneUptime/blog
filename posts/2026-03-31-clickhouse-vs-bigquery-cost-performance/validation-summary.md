# Validation Summary: ClickHouse vs BigQuery Cost and Performance

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- ClickHouse (self-hosted and ClickHouse Cloud)
- Google BigQuery
- SQL (ClickHouse dialect and standard SQL)
- Mermaid diagrams

## Sources Consulted
- BigQuery pricing documentation: https://cloud.google.com/bigquery/pricing
- BigQuery SQL reference (COUNT function): https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions#count
- ClickHouse SQL reference (count, lagInFrame, window functions): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- BigQuery Storage Write API documentation: https://cloud.google.com/bigquery/docs/write-api

## Issues Found
1. **`count()` in cross-database query example**: The SQL query at line 68 was labeled as working in "Both" ClickHouse and BigQuery, but used `count()` without arguments. This is valid ClickHouse syntax but invalid in BigQuery, which requires `count(*)`. Changed `count()` to `count(*)`, which is valid in both systems.

## Review Notes
- BigQuery pricing quoted ($0.02/GB active storage, $0.01/GB long-term, $5/TB on-demand query) reflects logical storage pricing, which is the default. BigQuery also offers physical storage pricing at different rates, but the post's numbers are correct for the default model.
- BigQuery on-demand pricing includes 1 TB of free query processing per month, which the post omits. This is a minor simplification acceptable in a comparison article.
- The "10-50x cheaper" claim for self-hosted ClickHouse at scale is a rough estimate. Actual savings vary widely depending on query patterns, data volumes, and infrastructure choices, but the range is plausible for high-volume workloads.
- The BigQuery streaming inserts pricing ($0.01 per 200MB) refers to the legacy insertAll API. The newer Storage Write API has different pricing, but the post correctly mentions it separately in the Data Freshness section.
- The ClickHouse sessionization query correctly uses `lagInFrame()` (ClickHouse-specific window function) and DateTime arithmetic returning seconds, making the `> 1800` comparison (30 minutes) valid.
- Performance estimates (ClickHouse 50-200ms vs BigQuery 2-8s for 100M row aggregation) are reasonable ballpark figures consistent with published benchmarks.
