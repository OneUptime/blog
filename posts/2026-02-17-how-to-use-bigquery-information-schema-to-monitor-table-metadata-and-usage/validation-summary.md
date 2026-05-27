# Validation Summary: How to Use BigQuery INFORMATION_SCHEMA to Monitor Table Metadata and Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery INFORMATION_SCHEMA views
- GoogleSQL
- BigQuery storage and query cost monitoring

## Sources Consulted
- BigQuery INFORMATION_SCHEMA introduction: https://docs.cloud.google.com/bigquery/docs/information-schema-intro
- BigQuery TABLE_STORAGE view: https://docs.cloud.google.com/bigquery/docs/information-schema-table-storage
- BigQuery JOBS / JOBS_BY_PROJECT view: https://docs.cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery COLUMNS view: https://docs.cloud.google.com/bigquery/docs/information-schema-columns
- BigQuery PARTITIONS view: https://docs.cloud.google.com/bigquery/docs/information-schema-partitions
- BigQuery TABLES view: https://docs.cloud.google.com/bigquery/docs/information-schema-tables
- BigQuery pricing: https://cloud.google.com/bigquery/pricing

## Issues Found
- The post used dataset-qualified `INFORMATION_SCHEMA.TABLE_STORAGE` references such as `my_project.my_dataset.INFORMATION_SCHEMA.TABLE_STORAGE`. Google Cloud documents `TABLE_STORAGE` as a region-qualified project-level view. Updated these queries to use `my_project`.`region-us`.INFORMATION_SCHEMA.TABLE_STORAGE` and filter with `table_schema = 'my_dataset'`.
- The query cost examples estimated cost from `total_bytes_processed * 5`, which is outdated and less accurate for on-demand billing. Updated cost calculations to use `total_bytes_billed` and the current documented US on-demand rate of `$6.25` per TiB.
- The cost queries did not exclude parent `SCRIPT` rows, which can double-count multi-statement query jobs. Added `statement_type` filters that keep non-script jobs while allowing `NULL` statement types.
- The table-level query cost example implied exact per-table cost attribution. Updated the wording and aliases to clarify that it reports referenced-query cost associated with each referenced table.
- The partition-filter example claimed it found queries without partition filters, but the SQL only found large queries referencing a table. Updated the heading, description, and comment to frame it as a review list for possible missing partition filters.

## Review Notes
- Cost estimates are accurate for on-demand pricing in the documented US pricing table, but organizations using BigQuery capacity pricing should use slot/reservation reporting instead of per-query byte billing for spend attribution.
- `referenced_tables` is only populated for query jobs that are not cache hits, so unused-table analysis based on this field can miss tables referenced only by cached queries.
