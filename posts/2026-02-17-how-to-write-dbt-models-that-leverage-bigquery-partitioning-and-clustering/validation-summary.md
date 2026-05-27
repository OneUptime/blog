# Validation Summary: How to Write dbt Models That Leverage BigQuery Partitioning and Clustering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- dbt
- dbt BigQuery adapter
- Google BigQuery
- BigQuery table partitioning
- BigQuery table clustering
- BigQuery INFORMATION_SCHEMA
- SQL
- YAML

## Sources Consulted
- dbt BigQuery configurations: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- BigQuery partitioned tables overview: https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery clustered tables overview: https://docs.cloud.google.com/bigquery/docs/clustered-tables
- BigQuery managing partitioned tables: https://docs.cloud.google.com/bigquery/docs/managing-partitioned-tables
- BigQuery INFORMATION_SCHEMA JOBS view: https://docs.cloud.google.com/bigquery/docs/information-schema-jobs

## Issues Found
- The post listed only `day`, `month`, and `year` as dbt BigQuery `granularity` options. dbt also supports `hour` for applicable time-based partition columns, so the text now lists `hour`, `day`, `month`, and `year`, with a note that availability depends on the partition column type.
- The clustering refresher said clustering sorts data within each partition, which is incomplete because BigQuery also supports clustering unpartitioned tables. The wording now says clustering sorts data within a table, or within each partition of a partitioned table.
- One SQL example comment implied that filtering on any clustered column is equally efficient. BigQuery clustering order matters, and filters on leading clustering columns get the most benefit, so the comment now refers to filtering on the partition column and leading clustering columns.

## Review Notes
The dbt configuration keys used in the examples, including `partition_by`, `cluster_by`, `partition_expiration_days`, and `require_partition_filter`, match current dbt BigQuery documentation. The BigQuery INFORMATION_SCHEMA query uses supported JOBS view fields such as `query`, `total_bytes_processed`, `total_bytes_billed`, and `cache_hit`.
