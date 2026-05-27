# Validation Summary: How to Set Up Logical Replication from Cloud SQL PostgreSQL to BigQuery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Datastream
- Cloud SQL for PostgreSQL
- PostgreSQL logical replication and logical decoding
- BigQuery
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud Datastream: Configure a Cloud SQL for PostgreSQL database for CDC: https://docs.cloud.google.com/datastream/docs/configure-cloudsql-psql
- Google Cloud Datastream: Stream data from PostgreSQL databases: https://docs.cloud.google.com/datastream/docs/sources-postgresql
- Google Cloud Datastream: BigQuery destination: https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream: Configure a BigQuery destination: https://docs.cloud.google.com/datastream/docs/configure-bigquery-destination
- Google Cloud Datastream: Manage streams: https://docs.cloud.google.com/datastream/docs/manage-streams
- Google Cloud Datastream: Manage connection profiles: https://docs.cloud.google.com/datastream/docs/manage-connection-profiles
- Google Cloud Datastream: Manage private connectivity configurations: https://docs.cloud.google.com/datastream/docs/manage-private-connectivity-configurations
- Google Cloud SDK reference: gcloud datastream streams create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud SDK reference: gcloud datastream connection-profiles create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- Google Cloud SDK reference: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring metrics reference for Datastream metrics: https://cloud.google.com/monitoring/api/metrics_gcp_d_h
- PostgreSQL documentation: pg_create_logical_replication_slot: https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found
- The PostgreSQL setup omitted creating the logical replication slot that the stream configuration references. Added a `pg_create_logical_replication_slot('datastream_slot', 'pgoutput')` command and updated the section heading.
- The BigQuery `singleTargetDataset.datasetId` example used a REST-style resource path. Updated it to the Datastream CLI/API format `my-project:replicated_data`.
- The explanation of `dataFreshness` said it controls how often BigQuery tables are updated. Updated it to describe the maximum staleness limit Datastream sets on BigQuery tables.
- The BigQuery examples queried `orders`, but single-target dataset mode writes tables as `<schema>_<table>`. Updated examples to query `public_orders`.
- The BigQuery metadata example treated `source_timestamp` as directly timestamp-like. Wrapped it with `TIMESTAMP_MILLIS()` because Datastream documents `SOURCE_TIMESTAMP` as an integer field.
- The write-mode explanation implied all updated/deleted tables use merge mode. Clarified that merge mode is the default for tables with primary keys, while tables without primary keys are append-only.
- The schema-change section implied type changes are automatically handled. Updated it to state that adding columns at the end can be detected, while drops, middle-column additions, reordering, and type changes can cause errors or data corruption.
- The Cloud Monitoring alert command used obsolete/nonexistent flags. Replaced `--condition-threshold-value` and `--condition-threshold-duration` with current `--if='> 600'` and `--duration=300s` flags.
- The unsupported PostgreSQL type note was too broad. Updated it to match Datastream's documented limitations for hstore, geometric/range types, and unsupported/user-defined arrays.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud SDK reference pages were used to verify CLI syntax. The post remains a valid high-level setup guide, but production deployments should also consider Datastream IAM permissions, BigQuery API enablement, primary-key and replica-identity requirements, and WAL retention alerts before rollout.
