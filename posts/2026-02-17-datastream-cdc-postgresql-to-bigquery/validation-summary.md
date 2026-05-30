# Validation Summary: How to Configure Datastream CDC from PostgreSQL to BigQuery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Datastream
- Cloud SQL for PostgreSQL
- Self-managed PostgreSQL
- PostgreSQL logical replication, publications, and replication slots
- BigQuery
- Google Cloud CLI

## Sources Consulted
- Google Cloud Datastream PostgreSQL source overview: https://docs.cloud.google.com/datastream/docs/sources-postgresql
- Google Cloud Datastream Cloud SQL for PostgreSQL CDC configuration: https://docs.cloud.google.com/datastream/docs/configure-cloudsql-psql
- Google Cloud Datastream self-managed PostgreSQL CDC configuration: https://docs.cloud.google.com/datastream/docs/configure-self-managed-psql
- Google Cloud Datastream BigQuery destination documentation: https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream BigQuery data type mappings: https://docs.cloud.google.com/datastream/docs/bq-map-data-types
- Google Cloud CLI Datastream stream create reference: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud CLI Datastream stream update reference: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/update
- Google Cloud CLI Datastream connection profile create reference: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- Google Cloud Datastream private connectivity documentation: https://docs.cloud.google.com/datastream/docs/manage-private-connectivity-configurations
- PostgreSQL logical replication documentation: https://www.postgresql.org/docs/current/logical-replication.html

## Issues Found
- The post said Datastream creates the PostgreSQL replication slot. Google Cloud's setup docs require creating the logical replication slot and passing its name to Datastream, so the explanation now says Datastream reads from the slot and the SQL setup now creates `datastream_slot` with `pgoutput`.
- The Cloud SQL networking section implied editing `pg_hba.conf`, which is not applicable to Cloud SQL. The instruction now scopes `pg_hba.conf` changes to self-managed PostgreSQL.
- The PostgreSQL connection profile used a private hostname but did not attach the private connectivity configuration. Added `--private-connection=pg-private-conn`.
- The stream creation command used inline JSON for flags that the Google Cloud CLI documents as paths to YAML or JSON files. Split the source and destination configuration into JSON snippets and changed the CLI command to reference those files.
- The stream creation command omitted the required backfill mode. Added `--backfill-all`.
- The BigQuery destination config used an incorrect dataset ID format and omitted the write mode. Updated it to `my-project:pg_replicated` and included `merge`.
- The stream start command omitted `--update-mask=state`, which the official CLI example uses when changing only the stream state. Added the update mask.
- The PostgreSQL to BigQuery type mapping for `json`, `jsonb`, and arrays was outdated. Updated JSON types to native BigQuery `JSON`, arrays to `JSON`, and clarified `NUMERIC` can map to `NUMERIC`, `BIGNUMERIC`, or `STRING` depending on precision and scale.
- The JSON example described parsing a STRING and filtered on `_metadata_deleted`, which is not the documented Datastream BigQuery metadata field. Updated the query text and removed the invalid filter.
- The TOAST guidance recommended `REPLICA IDENTITY FULL` for tables with TOAST columns. Current Datastream guidance says to avoid `FULL` with BigQuery except as a last resort and to prefer primary keys or `UNIQUE NOT NULL` indexes. Rewrote that guidance and sample SQL accordingly.
- The verification query referenced `_metadata_change_type` and lower-case metadata fields that do not match the documented BigQuery destination metadata. Updated it to use `datastream_metadata.SOURCE_TIMESTAMP`.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference rather than local `--help` output. The post is now validated against the current Google Cloud documentation available on 2026-05-30.
