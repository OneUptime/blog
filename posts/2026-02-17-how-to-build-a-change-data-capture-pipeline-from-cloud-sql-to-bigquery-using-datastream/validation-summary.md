# Validation Summary: How to Build a Change Data Capture Pipeline from Cloud SQL to BigQuery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Datastream
- Cloud SQL for PostgreSQL
- Cloud SQL for MySQL
- BigQuery
- Google Cloud CLI
- Cloud Monitoring
- SQL

## Sources Consulted
- Google Cloud Datastream BigQuery destination: https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream BigQuery destination configuration: https://docs.cloud.google.com/datastream/docs/configure-bigquery-destination
- Google Cloud SDK `gcloud datastream streams create`: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud SDK `gcloud datastream connection-profiles create`: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- Google Cloud Datastream private connectivity configurations: https://docs.cloud.google.com/datastream/docs/manage-private-connectivity-configurations
- Google Cloud Datastream Cloud SQL for PostgreSQL source configuration: https://docs.cloud.google.com/datastream/docs/configure-cloudsql-psql
- Google Cloud Datastream Cloud SQL for MySQL source configuration: https://docs.cloud.google.com/datastream/docs/configure-cloudsql-mysql
- Cloud SQL for MySQL PITR / binary logging configuration: https://docs.cloud.google.com/sql/docs/mysql/backup-recovery/configure-pitr
- Google Cloud Datastream FAQ and behavior overview: https://docs.cloud.google.com/datastream/docs/faq and https://docs.cloud.google.com/datastream/docs/behavior-overview
- Google Cloud Datastream monitoring best practices: https://docs.cloud.google.com/datastream/docs/best-practices-general
- Google Cloud Monitoring metrics list: https://cloud.google.com/monitoring/api/metrics_gcp_d_h
- Google Cloud SDK `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The MySQL setup used unsupported Cloud SQL flags (`log_bin` and `binlog_format`). Replaced this with `--enable-bin-log` for PITR/binary logging and supported Datastream-friendly MySQL flags.
- The PostgreSQL setup referenced a replication slot in the stream configuration but never created it. Added the `PG_CREATE_LOGICAL_REPLICATION_SLOT` command.
- The PostgreSQL stream included `order_items`, but the publication did not. Added `order_items` to the publication.
- The private IP connection profile example did not attach the Datastream private connection. Reordered the setup so the private connection is created first and added `--private-connection`.
- The stream command passed inline JSON for flags that the current `gcloud` reference documents as YAML/JSON file paths. Reworked the example to create `postgresql-source-config.json` and `bigquery-destination-config.json`, then pass those file paths.
- The BigQuery examples assumed append-only change history while the default BigQuery write mode is merge mode. Updated the destination configuration to use `appendOnly`.
- The post used `is_deleted`, which is not present for append-only BigQuery tables. Replaced it with `datastream_metadata.change_type` and handled `DELETE` and `UPDATE-DELETE` events.
- The post treated `datastream_metadata.source_timestamp` as a BigQuery timestamp even though Datastream documents it as an integer. Wrapped it with `TIMESTAMP_MILLIS()` in queries that need timestamp arithmetic or display.
- The Cloud Monitoring CLI example used outdated threshold flags and a millisecond threshold for a metric documented in seconds. Updated it to use `--if='> 300'` and `--duration=300s`.
- The closing summary claimed exactly-once delivery. Datastream documentation says delivery is at least once, with metadata for deduplication, so the wording was corrected.

## Review Notes
`gcloud` was not installed in the local workspace, so CLI validation was performed against the official Google Cloud SDK reference documentation instead of local `--help` output. For production append-only CDC views, consider adding explicit deduplication by Datastream metadata in addition to ordering logic.
