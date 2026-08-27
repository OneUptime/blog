# Validation Summary: Fix BigQuery Cross-Location Reads and Writes for External Tables

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Google Cloud BigQuery
- BigQuery external tables and global queries
- Google Cloud Storage
- Google Cloud CLI (`bq` and `gcloud storage`)
- GoogleSQL data definition language

## Sources Consulted

- [Introduction to external tables: Cloud Storage location considerations](https://cloud.google.com/bigquery/docs/external-tables#storage-location-considerations)
- [Create Cloud Storage external tables](https://cloud.google.com/bigquery/docs/external-data-cloud-storage)
- [BigQuery locations](https://cloud.google.com/bigquery/docs/locations)
- [Run a BigQuery query](https://cloud.google.com/bigquery/docs/running-queries)
- [Create BigQuery datasets](https://cloud.google.com/bigquery/docs/datasets)
- [Manage BigQuery datasets](https://cloud.google.com/bigquery/docs/managing-datasets)
- [BigQuery `bq` command-line tool reference](https://cloud.google.com/bigquery/docs/reference/bq-cli-reference)
- [GoogleSQL data definition language: `CREATE EXTERNAL TABLE`](https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language#create_external_table_statement)
- [`gcloud storage buckets describe` reference](https://cloud.google.com/sdk/gcloud/reference/storage/buckets/describe)
- [BigQuery global queries](https://cloud.google.com/bigquery/docs/global-queries)
- [Cloud Storage bucket locations](https://cloud.google.com/storage/docs/locations)
- [Cloud Storage bucket relocation overview](https://cloud.google.com/storage/docs/bucket-relocation/overview)
- [Move data between Cloud Storage buckets](https://cloud.google.com/storage/docs/moving-buckets)

## Issues Found

- The opening attributed the location error too broadly to any bucket or dataset mismatch. The current BigQuery Locations documentation says non-colocated Cloud Storage reads can incur data transfer charges, while the dedicated external-table documentation still directs users to colocate the bucket and dataset. The post now attributes `Cannot read and write in different locations` specifically to a mismatch among the query job, source dataset, and destination dataset, and discusses bucket colocation separately.
- The external-table inspection command used the literal placeholder `EXTERNAL_TABLE`, even though the later example table is named `events`. Added an `EXTERNAL_TABLE='events'` variable and referenced it in the command so the example is internally consistent and runnable.
- The dataset-creation commands reused the dataset IDs that the inventory section treats as existing. Because a BigQuery dataset's location cannot be changed and `bq mk` cannot recreate an existing dataset in another location, the fix now uses explicit new dataset IDs and carries those IDs through the external-table and query examples.
- The explanation said an empty query could fall back to a default location, but `bq query` with no query string fails instead. Reworded this to cover queries with no statically identifiable resource location, including dynamically generated queries, which BigQuery cannot use for automatic location detection.
- The external-table location link used an obsolete fragment. Updated it to the current Cloud Storage location-considerations fragment.

## Review Notes

- All remaining `bq`, `gcloud storage`, shell, and GoogleSQL syntax was verified against the current official references and local Google Cloud SDK help (SDK 561.0.0, `bq` 2.1.29).
- Google's current documentation contains a location-wording tension: the dedicated external-table guide says Cloud Storage buckets must be colocated and lists `europe-west1` with `EU`, while the newer general BigQuery Locations page describes non-colocated reads as chargeable and uses `europe-west4` as the `EU` transfer anchor. The post now avoids claiming that bucket non-colocation necessarily causes the featured read/write error.
- BigQuery global queries remain a Preview feature. The post correctly describes their enablement, permission, destination-location execution, temporary cross-region replication, added cost, latency, and data-residency implications.
- Cross-region dataset copy is Beta and does not copy external tables, views, or routines. Those resources must be recreated; the post correctly recreates its external table.
- The current BigQuery Locations page announces that later in 2026 the service will stop using the term multi-region and will colocate `US` and `EU` with `us-central1` and `europe-west4`, respectively. The post's current distinction between `US` and `us-central1` is accurate as of the validation date but should be rechecked after that rollout.
