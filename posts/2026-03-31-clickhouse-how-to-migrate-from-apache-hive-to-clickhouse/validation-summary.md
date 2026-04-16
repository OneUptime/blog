# Validation Summary: How to Migrate from Apache Hive to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Apache Hive (HiveQL, HDFS, MapReduce/Tez/Spark execution)
- ClickHouse (MergeTree engine, `s3` table function, `ARRAY JOIN`, `quantile`, `system.parts`)
- Parquet / ORC file formats
- Amazon S3 / S3A filesystem

## Sources Consulted
- ClickHouse docs — MergeTree engine and partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — `s3` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse docs — `ARRAY JOIN`: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse docs — `quantile` functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse docs — `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- Apache Hive Language Manual — `INSERT OVERWRITE DIRECTORY`: https://cwiki.apache.org/confluence/display/Hive/LanguageManual+DML
- Apache Hive Language Manual — `LATERAL VIEW` / `explode`: https://cwiki.apache.org/confluence/display/Hive/LanguageManual+LateralView
- Apache Hive UDF reference — `percentile`, `FROM_UNIXTIME`, `UNIX_TIMESTAMP`: https://cwiki.apache.org/confluence/display/Hive/LanguageManual+UDF

## Issues Found
- **"CSV" vs "TSV" wording**: The post described the `hive -e ... > /tmp/page_views.tsv` command as exporting to CSV. Hive CLI output is tab-separated (`\t`) by default, and the file extension used was already `.tsv`. Changed the prose from "export to CSV" to "export to TSV" to match the actual output format and the filename in the command.

## Review Notes
- The Hive `INSERT OVERWRITE DIRECTORY ... STORED AS PARQUET` syntax is valid, as is the `s3a://` scheme for writing to S3 from Hadoop/Hive.
- The ClickHouse `s3(url, access_key, secret_key, format)` signature used in Step 3 matches the documented overload.
- `PERCENTILE(col, p)` in Hive requires an integer column, which `duration INT` satisfies. For non-integer columns, `percentile_approx` would be needed — worth mentioning if the post is ever expanded.
- `system.parts` query in Step 5 will include inactive/outdated parts after merges; adding `AND active = 1` would be a nice refinement but the current query is not incorrect.
- ClickHouse can also read Parquet directly from HDFS via the `hdfs` table function, which could be a useful follow-up to avoid the HDFS → S3 hop, but this is outside the scope of the correction task.
