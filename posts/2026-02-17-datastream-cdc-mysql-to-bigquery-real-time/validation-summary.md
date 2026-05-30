# Validation Summary: How to Set Up Datastream CDC from MySQL to BigQuery in Real Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Datastream
- Cloud SQL for MySQL
- Self-managed MySQL
- MySQL binary logging
- BigQuery
- Google Cloud CLI

## Sources Consulted
- Google Cloud Datastream: Configure a self-managed MySQL database for CDC: https://docs.cloud.google.com/datastream/docs/configure-self-managed-mysql
- Google Cloud Datastream: Configure a Cloud SQL for MySQL database for CDC: https://docs.cloud.google.com/datastream/docs/configure-cloudsql-mysql
- Google Cloud Datastream: Configure a BigQuery destination: https://docs.cloud.google.com/datastream/docs/configure-bigquery-destination
- Google Cloud Datastream: BigQuery destination write behavior and metadata: https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream: Events and streams metadata: https://docs.cloud.google.com/datastream/docs/events-and-streams
- Google Cloud SDK: gcloud datastream connection-profiles create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- Google Cloud SDK: gcloud datastream private-connections create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/private-connections/create
- Google Cloud SDK: gcloud datastream streams create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud SDK: gcloud datastream streams update: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/update

## Issues Found
- The self-managed MySQL binlog configuration used `expire_logs_days = 3`, but current Google Datastream guidance recommends 7 days and uses `binlog_expire_logs_seconds = 604800` for MySQL 8.0.3 and later. Updated the configuration and verification commands, with version-specific notes for older MySQL versions.
- The Cloud SQL networking description incorrectly referred to using the Cloud SQL proxy through a private connection profile. Updated it to describe Datastream private connectivity configuration and added `--private-connection` to the MySQL connection profile example.
- The stream creation example used unsupported `--source-config` and `--destination-config` flags and a combined stream JSON shape. Replaced it with separate MySQL source and BigQuery destination config files, using current `--mysql-source-config`, `--bigquery-destination-config`, and `--backfill-all` flags.
- The BigQuery destination dataset ID used a resource path format that does not match the gcloud BigQuery destination config examples. Updated it to `my-project:replicated_data`.
- The stream start command omitted `--update-mask=state`, which is shown in the current gcloud update example. Added the update mask.
- The BigQuery output section described non-current metadata fields such as `_metadata_deleted` and `_metadata_change_type`. Updated the section to use the documented `datastream_metadata` fields for append-only mode.
- The sample BigQuery queries used table names and timestamp comparisons that did not match the configured single-dataset append-only destination. Updated table names, timestamp conversion with `TIMESTAMP_MILLIS` and `UNIX_MILLIS`, and current-state filtering using `CHANGE_TYPE`.

## Review Notes
The revised post uses append-only BigQuery mode so the point-in-time query remains valid. In merge mode, BigQuery keeps the current replica state for primary-key tables and does not retain a historical event stream.
