# Validation Summary: How to Set Up a CDC Pipeline from Cloud SQL to BigQuery Using Datastream

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Datastream
- Cloud SQL for MySQL
- Cloud SQL for PostgreSQL
- BigQuery
- Cloud Monitoring
- gcloud CLI
- SQL and dbt

## Sources Consulted
- Google Cloud Datastream: Configure a Cloud SQL for MySQL database for CDC: https://docs.cloud.google.com/datastream/docs/configure-cloudsql-mysql
- Google Cloud Datastream: Configure a Cloud SQL for PostgreSQL database for CDC: https://docs.cloud.google.com/datastream/docs/configure-cloudsql-psql
- Google Cloud Datastream: BigQuery destination: https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream: Configure a BigQuery destination: https://docs.cloud.google.com/datastream/docs/configure-bigquery-destination
- Google Cloud SDK: gcloud datastream streams create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud SDK: gcloud datastream streams update: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/update
- Google Cloud SDK: gcloud datastream connection-profiles create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- Google Cloud SDK: gcloud datastream private-connections create: https://cloud.google.com/sdk/gcloud/reference/datastream/private-connections/create
- Google Cloud SDK: gcloud sql instances patch: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud Monitoring metrics list for Datastream metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h
- Google Cloud SDK: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The Cloud SQL for MySQL setup used `log_bin=on`, `binlog_format=ROW`, and `binlog_row_image=FULL` as Cloud SQL database flags. Updated it to enable binary logging with `--enable-bin-log` and to set the Datastream-recommended timeout flags for binlog-based replication.
- The MySQL grants split replication privileges and table access in a way that did not match the Datastream Cloud SQL guidance. Consolidated the example grant to include `REPLICATION SLAVE`, `REPLICATION CLIENT`, and `SELECT`.
- The PostgreSQL setup omitted the logical replication slot required by Datastream. Added `PG_CREATE_LOGICAL_REPLICATION_SLOT(..., 'pgoutput')`.
- The Datastream stream examples used inline snake_case JSON for `--mysql-source-config` and `--bigquery-destination-config`. Updated the examples to write JSON config files with camelCase field names, which the gcloud Datastream commands expect.
- The first stream example implied append-mode querying but did not configure append-only mode. Added an explicit `appendOnly` BigQuery destination config.
- The BigQuery dataset ID format used `projects/my-project/datasets/replicated_data`, which does not match the gcloud Datastream example format for `singleTargetDataset.datasetId`. Updated it to `my-project:replicated_data`.
- The BigQuery metadata examples used `datastream_metadata.is_deleted` for append-only mode. Updated the examples to use `CHANGE_TYPE` semantics with `INSERT`, `UPDATE-INSERT`, `UPDATE-DELETE`, and `DELETE` events.
- The merge-mode section did not mention Datastream's primary-key requirement and append-only fallback for tables without primary keys. Added that caveat.
- The Monitoring section used stale or invalid metric and CLI flag names (`stream/total_latency`, `stream/throughput`, `--condition-threshold-value`, and `--condition-threshold-comparison`). Updated it to current Datastream metrics and `gcloud monitoring policies create` flags.
- The monitoring command comment said it listed recent stream events, but the command lists stream resources and their states. Corrected the comment.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
