# Validation Summary: ClickHouse vs Google BigQuery for Cost and Performance

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- ClickHouse (self-hosted and ClickHouse Cloud)
- Google BigQuery (on-demand and streaming inserts)
- Google Cloud Platform (Colossus storage, Dremel compute)
- AWS EC2 (c5.2xlarge pricing reference)
- BigQuery Standard SQL
- ClickHouse SQL
- Python `google-cloud-bigquery` client

## Sources Consulted
- [BigQuery pricing](https://cloud.google.com/bigquery/pricing)
- [BigQuery Timestamp functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions)
- [BigQuery Date functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions)
- [ClickHouse date/time functions](https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)
- [ClickHouse uniq / count aggregate functions](https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq)
- [AWS EC2 On-Demand pricing (c5.2xlarge)](https://aws.amazon.com/ec2/pricing/on-demand/)
- [BigQuery streaming inserts (tabledata.insertAll)](https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery)

## Issues Found

1. **Outdated BigQuery on-demand pricing.** Post stated "$5.00 per TB scanned". Google BigQuery on-demand analysis pricing has been $6.25 per TiB (with first 1 TiB/month free) since July 5, 2023 and this is still the current 2026 rate. Updated the pricing block, the 1 TiB example ($6.25/query, 100 queries/day = $625/day = $18,750/month), and the Python comparison script (variable renamed to `bq_scanned_tib`, multiplier updated to 6.25, printed output updated accordingly).

2. **Incorrect SQL function for a TIMESTAMP column.** The BigQuery example used `DATE_TRUNC(ts, DAY)`, but `ts` is a TIMESTAMP (compared against `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), ...)`). `DATE_TRUNC` in BigQuery Standard SQL only accepts DATE inputs; TIMESTAMP inputs require `TIMESTAMP_TRUNC`. Replaced `DATE_TRUNC` with `TIMESTAMP_TRUNC`.

## Review Notes
- BigQuery also offers Editions (Standard/Enterprise/Enterprise Plus) capacity-based pricing as an alternative to on-demand; the post focuses on on-demand, which is a reasonable scope.
- The legacy `tabledata.insertAll` streaming API used by `insert_rows_json` is still priced at roughly $0.01 per 200 MB, which matches the post. For new workloads, the BigQuery Storage Write API is cheaper (default stream free, dedicated streams $0.025/GB), but the post's example legitimately describes the legacy path.
- c5.2xlarge on-demand pricing of ~$0.34/hr is accurate for us-east-1 Linux; pricing differs by region.
- The ClickHouse query uses `toStartOfDay(ts)` and `uniq(user_id)`, both valid ClickHouse functions, and `now() - INTERVAL 30 DAY` is valid ClickHouse INTERVAL syntax.
- "Cold start latency 1-3 seconds" for BigQuery is a reasonable rule of thumb; actual latency varies with slot availability and query complexity.
