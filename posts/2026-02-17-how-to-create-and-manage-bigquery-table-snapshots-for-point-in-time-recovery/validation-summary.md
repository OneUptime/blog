# Validation Summary: How to Create and Manage BigQuery Table Snapshots for Point-in-Time Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery table snapshots
- GoogleSQL DDL
- BigQuery bq command-line tool
- BigQuery INFORMATION_SCHEMA views
- Cloud Scheduler / scheduled runtimes

## Sources Consulted
- BigQuery table snapshots introduction: https://cloud.google.com/bigquery/docs/table-snapshots-intro
- BigQuery create table snapshots documentation: https://cloud.google.com/bigquery/docs/table-snapshots-create
- BigQuery restore table snapshots documentation: https://cloud.google.com/bigquery/docs/table-snapshots-restore
- BigQuery update table snapshot metadata documentation: https://cloud.google.com/bigquery/docs/table-snapshots-update
- BigQuery GoogleSQL DDL reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery INFORMATION_SCHEMA TABLE_SNAPSHOTS view: https://cloud.google.com/bigquery/docs/information-schema-snapshots
- BigQuery INFORMATION_SCHEMA TABLE_STORAGE view: https://cloud.google.com/bigquery/docs/information-schema-table-storage
- BigQuery INFORMATION_SCHEMA TABLE_STORAGE_USAGE_TIMELINE view: https://cloud.google.com/bigquery/docs/information-schema-table-storage-usage
- BigQuery scheduled table snapshots documentation: https://cloud.google.com/bigquery/docs/table-snapshots-scheduled
- BigQuery pricing documentation: https://cloud.google.com/bigquery/pricing

## Issues Found
- The post claimed snapshot creation was instant and restore always took seconds. Google documentation notes snapshot creation time can vary, and restore is documented as a copy/clone operation rather than a guaranteed fixed-duration operation. Changed the wording to "quickly", "typically fast", and "fast" where needed.
- The `bq cp --snapshot` examples omitted `--no_clobber`, which Google documents as required for snapshot creation with the bq CLI. Added `--no_clobber` to both snapshot creation commands.
- The post used `ALTER SNAPSHOT TABLE` to update snapshot expiration. BigQuery updates table and snapshot metadata with standard table metadata update mechanisms; the DDL form is `ALTER TABLE ... SET OPTIONS`. Updated the SQL example.
- The "Shell Script with Cloud Scheduler" heading implied Cloud Scheduler directly runs shell scripts. Cloud Scheduler triggers scheduled targets; shell scripts need to run from a scheduled runtime such as Cloud Run, a VM, or another orchestrated environment. Changed the heading to "Using a Shell Script from a Scheduled Runtime."
- The storage section said snapshot storage is billed at BigQuery's active storage rate. BigQuery storage billing depends on the dataset's logical or physical storage billing model and active/long-term storage. Updated the wording.
- The `TABLE_STORAGE` query was labeled as checking snapshot storage usage without caveat. Official documentation says clones and snapshots show byte values as if they were complete tables, so the values overestimate billed delta storage. Added comments explaining the limitation.
- The cross-project permissions sentence only mentioned `bigquery.tables.getData` and `bigquery.tables.create`. Google documentation requires additional source and destination permissions for snapshot creation, with `bigquery.tables.deleteSnapshot` needed when setting expiration. Updated the permissions sentence.

## Review Notes
The local `bq` CLI was not installed, so CLI validation was performed against official Google Cloud documentation. The post remains technically relevant and valid after the targeted corrections.
