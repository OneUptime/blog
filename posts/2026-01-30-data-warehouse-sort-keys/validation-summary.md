# Validation Summary: How to Implement Sort Keys

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon Redshift
- Redshift sort keys
- Redshift COPY
- Redshift VACUUM
- Redshift system views and tables
- Google BigQuery clustered tables
- Snowflake clustering and micro-partitions

## Sources Consulted
- Amazon Redshift sort keys: https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html
- Amazon Redshift interleaved sort keys: https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data-interleaved.html
- Amazon Redshift CREATE TABLE syntax: https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_TABLE_NEW.html
- Amazon Redshift COPY command: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html
- Amazon Redshift COPY from columnar data formats: https://docs.aws.amazon.com/redshift/latest/dg/copy-usage_notes-copy-from-columnar.html
- Amazon Redshift VACUUM command: https://docs.aws.amazon.com/redshift/latest/dg/r_VACUUM_command.html
- Amazon Redshift SVV_TABLE_INFO: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html
- Amazon Redshift STL_SCAN: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_SCAN.html
- Amazon Redshift STL_QUERY: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_QUERY.html
- Amazon Redshift SVV_VACUUM_PROGRESS: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_VACUUM_PROGRESS.html
- BigQuery clustered tables: https://cloud.google.com/bigquery/docs/clustered-tables
- Snowflake micro-partitions and data clustering: https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions

## Issues Found
- The introduction treated Amazon Redshift, BigQuery, and Snowflake as if they all used Redshift-style sort keys and zone maps. Updated the wording to identify Redshift sort keys specifically and describe BigQuery/Snowflake as similar clustering or ordering features.
- The Redshift sort key explanation was generalized across databases. Qualified the 1 MB block and min/max metadata discussion as Redshift behavior.
- The interleaved sort key explanation claimed a specific Z-order curve algorithm that is not stated in the official Redshift documentation. Replaced it with the documented equal-weight behavior.
- The interleaved sort key example used `sale_date` as an interleaved key even though Redshift warns against interleaved sort keys on monotonically increasing columns such as dates or timestamps. Changed the interleaved key and related query example to use `category`.
- The trade-off table claimed a specific "2x" load overhead and higher storage overhead from interleaving metadata. Changed these to documented higher load/vacuum maintenance overhead without unsupported numeric precision.
- The `COPY` example used `SORTKEY order_date`, which is not a valid Redshift COPY parameter and is not supported for Parquet COPY. Removed the invalid option and added a comment that source files should be prepared in sort-key order when possible.
- The monitoring section described `rows_pre_filter` versus `rows` as a block-skip percentage. Redshift documents these as scanned/filtered row counters, where a large difference can indicate inefficient filtering. Renamed the calculated metric to `filtered_row_percentage`, added `rows_pre_user_filter`, and included `is_rrscan` for range-restricted scan visibility.
- Added `VACUUM REINDEX` for interleaved sort keys, because Redshift documents it as the command used to re-analyze interleaved key distribution before vacuuming.
- The post said to limit interleaved sort keys to 4 columns. Redshift supports up to 8 interleaved sort key columns. Updated the guidance to the documented limit while still recommending restraint.
- The final monitoring query used `stl_query.elapsed`, which is not a documented `STL_QUERY` column. Replaced it with `DATEDIFF(milliseconds, q.starttime, q.endtime)`.

## Review Notes
The Redshift examples are now syntactically aligned with current AWS documentation. Future improvements could mention Redshift `SORTKEY AUTO` and automatic table optimization, which AWS currently recommends, but that was not required to correct the existing examples.
