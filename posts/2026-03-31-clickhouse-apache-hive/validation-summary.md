# Validation Summary: How to Use ClickHouse with Apache Hive

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (Hive engine, MergeTree, `hdfs()` and `s3()` table functions)
- Apache Hive (HiveQL, Hive Metastore, external tables, partitioning)
- HDFS
- Apache Parquet and ORC file formats
- Amazon S3 (as a Hive storage backend)
- Bash / cron for scheduling

## Sources Consulted
- ClickHouse Hive table engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/hive
- ClickHouse HDFS table function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/hdfs
- ClickHouse S3 table function / engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/s3
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Date/Time function docs: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Apache Hive Language Manual (DDL / external tables / MSCK REPAIR): https://cwiki.apache.org/confluence/display/Hive/LanguageManual+DDL

## Issues Found
1. **Invalid `<hive>` configuration block.** The original "Configuring ClickHouse to Connect to Hive" section showed a `<clickhouse><hive><metastore_host>...</metastore_host>...</hive></clickhouse>` configuration. ClickHouse's Hive engine has no such config section — the Metastore address is supplied directly in the `CREATE TABLE ... ENGINE = Hive(...)` statement. The only XML configuration the Hive engine documentation actually describes is `<local_cache_for_remote_fs>` for caching HDFS reads. I replaced the fabricated block with the real `local_cache_for_remote_fs` snippet from the ClickHouse docs and updated the surrounding text.
2. **Missing schema in `CREATE TABLE hive_user_events`.** The original example created a ClickHouse Hive-engine table without any column definitions. Per the Hive engine docs, schema is required and column names/types must match the underlying Hive table. I added explicit column definitions (`event_id String`, `user_id Int64`, `event_type String`, `page String`, `revenue Float64`, `ts DateTime`, `dt String`, `event_category String`) matching the earlier Hive DDL.
3. **Type mismatch in the daily sync query.** The original code used `WHERE dt = toYYYYMMDD(yesterday())`. `dt` is declared as `String` with values like `'2026-03-31'`, while `toYYYYMMDD(yesterday())` returns a `UInt32` like `20260416`, so the predicate would never match. I changed it to `WHERE dt = toString(yesterday())`, which yields the `YYYY-MM-DD` string used throughout the post.

## Review Notes
- The ClickHouse Hive engine is documented as read-only (SELECT only), which is consistent with how the post uses it.
- `LowCardinality(String)` columns in the `MergeTree` sync target are appropriate for low-cardinality fields like `event_type` and `event_category`.
- The `hdfs()` and `s3()` table-function examples, the Parquet/ORC `STORED AS` DDL, the `MSCK REPAIR TABLE` usage, and the partition-pruning query shapes are all consistent with the official ClickHouse and Hive documentation.
- The `netstat -tlnp` prerequisite command requires root/appropriate privileges to show the process name; on minimal systems `ss -tlnp | grep 9083` would be a more modern alternative, but `netstat` still works on most distributions, so this was left unchanged.
- Composite `PARTITION BY (dt, event_category)` is shown as a tuple; the ClickHouse docs' example uses a single-column `PARTITION BY day`. Tuple partitioning is generally valid in ClickHouse but is not explicitly exemplified in the Hive engine docs — readers should verify against their ClickHouse version if they encounter issues.
- The ACCESS_KEY/SECRET_KEY placeholders in the `s3()` examples are clearly meant as placeholders; in production, IAM roles or `named_collections` would be preferable to inline credentials.
