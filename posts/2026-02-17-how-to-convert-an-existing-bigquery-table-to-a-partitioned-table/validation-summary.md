# Validation Summary: How to Convert an Existing BigQuery Table to a Partitioned Table

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- GoogleSQL DDL and DML
- BigQuery partitioned tables
- BigQuery table copy jobs
- BigQuery `bq` command-line tool
- Cloud Storage export and load workflows

## Sources Consulted
- BigQuery partitioned tables overview: https://cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery creating partitioned tables: https://cloud.google.com/bigquery/docs/creating-partitioned-tables
- BigQuery GoogleSQL DDL reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery GoogleSQL export statements: https://cloud.google.com/bigquery/docs/reference/standard-sql/export-statements
- BigQuery GoogleSQL load statements: https://cloud.google.com/bigquery/docs/reference/standard-sql/load-statements
- BigQuery INFORMATION_SCHEMA.PARTITIONS reference: https://cloud.google.com/bigquery/docs/information-schema-partitions
- BigQuery scheduled queries: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery Data Transfer Service overview: https://cloud.google.com/bigquery/docs/dts-introduction
- BigQuery `bq` command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference

## Issues Found
- The switchover section said BigQuery does not have table rename support and used copy/delete as the primary rename method. BigQuery now supports `ALTER TABLE ... RENAME TO`, so the SQL example was updated to rename the original table to a backup name and then rename the new partitioned table to the original name.
- The ongoing-writes example captured a cutoff timestamp before CTAS, but the CTAS query copied the whole table. Rows inserted after the cutoff but visible to the CTAS could then be inserted again by the catch-up query. The CTAS example was changed to copy rows at or before the cutoff, and the catch-up insert now copies rows newer than the cutoff.
- The `bq` copy paragraph described copy operations as effectively renaming tables. This was softened to say the CLI can copy the partitioned table to the original table name, which matches `bq cp` behavior.
- The data verification comment called aggregate totals "checksums." It was changed to "aggregate checks" because the query does not compute a hash or checksum.

## Review Notes
The remaining examples match documented BigQuery syntax for partitioned CTAS, integer-range partitioning, `EXPORT DATA`, `LOAD DATA`, `CREATE TABLE COPY`, `INFORMATION_SCHEMA.PARTITIONS`, and scheduled-query/Data Transfer Service usage. The post's CTAS size guidance is heuristic rather than a documented limit, but it is framed as practical guidance rather than a hard BigQuery quota.
