# Validation Summary: How to Set Up a Lakehouse Architecture with ClickHouse

## Status
validated

## Post Type
Tutorial / Architecture guide

## Technologies Covered
- ClickHouse (DeltaLake engine, MergeTree, AggregatingMergeTree, storage policies, S3 disk)
- Delta Lake (open table format on S3)
- Apache Spark (Delta Lake writer)
- Amazon S3 (object storage)
- Bronze/Silver/Gold lakehouse layering pattern

## Sources Consulted
- ClickHouse DeltaLake engine docs: https://clickhouse.com/docs/engines/table-engines/integrations/deltalake
- ClickHouse INSERT INTO statement docs: https://clickhouse.com/docs/sql-reference/statements/insert-into
- ClickHouse AggregatingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SummingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse MergeTree storage policies / S3 disk docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **`INSERT INTO silver_events` column-count mismatch** — The target table declares 6 columns (one with a `DEFAULT toDate(event_time)`), but the SELECT projected only 5 columns without an explicit column list. ClickHouse maps SELECT outputs positionally, so without a column list this would either misalign data into `event_date` or error. **Fix:** added an explicit column list `(event_time, event_type, user_id, country, revenue)` so ClickHouse fills `event_date` from its DEFAULT expression.

2. **`SummingMergeTree` storing `uniq(user_id)` results** — `SummingMergeTree` sums numeric columns across rows with matching sort key on merge. Storing pre-computed cardinalities and then summing them double-counts overlapping users (e.g., 100 + 80 = 180 even when user sets overlap). **Fix:** changed the engine to `AggregatingMergeTree`, declared `unique_users` as `AggregateFunction(uniq, UInt32)`, switched the insert to `uniqState(user_id)`, and added a follow-up query example using `uniqMerge(unique_users)` to combine partial states. `total_revenue` and `total_events` remain plain numerics summed at query time.

## Review Notes
- **DeltaLake engine version requirement for writes** — The `DeltaLake` engine supported reads only until ClickHouse 25.10, when write support was added. The post does not perform writes against the `bronze_events` DeltaLake table (Spark writes to S3 directly), so this is not an issue here, but readers running pre-25.10 ClickHouse versions should be aware that any future `INSERT INTO bronze_events ...` would fail.
- **S3 disk credentials omitted** — The storage policy XML omits `<access_key_id>`/`<secret_access_key>` for the S3 disk. This is fine for illustration, but production deployments need either explicit credentials, an IAM role, or `<use_environment_credentials>true</use_environment_credentials>`.
- **`storage_policy = 'hot_cold'`** — Valid `MergeTree` setting; assumes the storage policy block from the later XML snippet is loaded into the server config before the table is created.
- **`max_data_part_size_bytes = 10737418240`** is 10 GiB, a reasonable threshold for moving large parts to the cold S3 tier.
