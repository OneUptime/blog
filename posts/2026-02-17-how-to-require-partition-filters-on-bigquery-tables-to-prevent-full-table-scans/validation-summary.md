# Validation Summary: How to Require Partition Filters on BigQuery Tables to Prevent Full Table Scans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery partitioned tables
- GoogleSQL DDL
- BigQuery `bq` command-line tool
- Terraform Google provider
- BigQuery `INFORMATION_SCHEMA`

## Sources Consulted
- Google Cloud BigQuery documentation: Query partitioned tables - https://docs.cloud.google.com/bigquery/docs/querying-partitioned-tables
- Google Cloud BigQuery documentation: Managing partitioned tables - https://docs.cloud.google.com/bigquery/docs/managing-partitioned-tables
- Google Cloud BigQuery documentation: Creating partitioned tables - https://docs.cloud.google.com/bigquery/docs/creating-partitioned-tables
- Google Cloud BigQuery documentation: bq command-line tool reference - https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud BigQuery documentation: `INFORMATION_SCHEMA.PARTITIONS` view - https://docs.cloud.google.com/bigquery/docs/information-schema-partitions
- Google Cloud BigQuery documentation: `INFORMATION_SCHEMA.TABLE_OPTIONS` view - https://docs.cloud.google.com/bigquery/docs/information-schema-table-options
- Terraform Registry: `google_bigquery_table` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_table

## Issues Found
- The ingestion-time partitioned table example used `PARTITION BY DATE(_PARTITIONTIME)`. BigQuery's current SQL documentation shows daily ingestion-time partitioning with `PARTITION BY _PARTITIONDATE`, so the example was corrected.
- The `bq` command for disabling the setting used `--norequire_partition_filter`. The official `bq` reference documents the flag as `--require_partition_filter={true|false}`, so the example was changed to `--require_partition_filter=false`.
- The bulk-enabling query claimed to find partitioned tables that do not require partition filters, but it did not check the current `require_partition_filter` option and could include unpartitioned tables because `INFORMATION_SCHEMA.PARTITIONS.partition_id` is `NULL` for unpartitioned tables. The query now filters for non-`NULL` partition IDs and excludes tables where `INFORMATION_SCHEMA.TABLE_OPTIONS` already reports `require_partition_filter = true`.

## Review Notes
The core explanation of BigQuery's partition filter requirement, view behavior, `ALTER TABLE SET OPTIONS`, and Terraform's top-level `require_partition_filter` field matches current official documentation. Local `bq` and `terraform` binaries were not installed in the workspace, so CLI and Terraform verification was performed against official documentation rather than local command output.
