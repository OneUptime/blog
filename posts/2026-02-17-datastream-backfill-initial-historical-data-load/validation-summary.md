# Validation Summary: How to Set Up Datastream Backfill for Initial Historical Data Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Datastream
- Datastream backfill
- BigQuery destination for Datastream
- Google Cloud CLI
- Cloud Scheduler
- MySQL
- SQL

## Sources Consulted
- Google Cloud CLI reference: `gcloud datastream streams create` - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud CLI reference: `gcloud datastream objects start-backfill` - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/objects/start-backfill
- Datastream REST API: stream object backfill state and object methods - https://cloud.google.com/datastream/docs/reference/rest/v1/projects.locations.streams.objects
- Datastream REST API: `projects.locations.streams.objects.startBackfillJob` - https://docs.cloud.google.com/datastream/docs/reference/rest/v1/projects.locations.streams.objects/startBackfillJob
- Datastream guide: manage backfill for stream objects - https://docs.cloud.google.com/datastream/docs/manage-backfill-for-the-objects-of-a-stream
- Datastream BigQuery destination documentation - https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Datastream events and streams documentation - https://docs.cloud.google.com/datastream/docs/events-and-streams
- MySQL `INFORMATION_SCHEMA.TABLES` documentation - https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html

## Issues Found
- The `gcloud datastream streams create` examples passed inline JSON to `--mysql-source-config` and `--bigquery-destination-config`. The Cloud CLI expects paths to YAML or JSON files, so the examples now create JSON config files and pass their paths.
- The BigQuery destination config used `projects/my-project/datasets/replicated` for `singleTargetDataset.datasetId`. The Cloud CLI documentation expects the `projectId:datasetId` form, so this was changed to `my-project:replicated`.
- The BigQuery destination examples omitted the write mode. The config now explicitly uses merge mode with `"merge": {}` to match the article's discussion of primary-key based application of changes.
- The manual stream creation example omitted required source and destination config flags. It now includes the same source and BigQuery destination config files as the automatic backfill example.
- The manual backfill commands used the non-existent `gcloud datastream streams objects ...` command group and non-existent `--mysql-database` / `--mysql-table` flags. They now use `gcloud datastream objects list`, `gcloud datastream objects start-backfill OBJECT_ID`, and `gcloud datastream objects stop-backfill OBJECT_ID` with `--stream`.
- The monitoring command used the wrong command group. It now uses `gcloud datastream objects list --stream=...`.
- The listed backfill states were incomplete. Added `PENDING` and `UNSUPPORTED`, which are part of the Datastream backfill job state enum.
- The Cloud Scheduler REST URL used `objects:startBackfill`, which does not match the Datastream REST API. It now uses the stream object resource path with `:startBackfillJob`.
- The consistency explanation claimed Datastream deduplicates backfill and CDC rows based on source timestamps. Google documentation describes BigQuery using event metadata and an internal change sequence number to apply events in the correct order, and merge mode applying changes based on source primary keys. The text and Mermaid note were updated accordingly.
- The SQL examples referenced `_metadata_deleted` and `datastream_metadata.source_timestamp` as if they could be used to deduplicate all merge-mode tables. Datastream's BigQuery metadata is a `datastream_metadata` struct, and `IS_DELETED` only appears in merge mode for tables without source primary keys. The examples were changed to avoid the incorrect deleted-column filter and to use the expected single-target table naming.
- The backfill exclusion example put `audit_log` in the source `excludeObjects`, which would exclude CDC replication too. The example now keeps `audit_log` in the source include list and uses `--mysql-excluded-objects` to exclude only automatic backfill.
- The fixed throughput estimate of 1-5 GB per hour was not supported by the official docs and could be misleading. It was replaced with a recommendation to estimate from observed throughput.

## Review Notes
The examples still use placeholder resource names such as `my-project`, `mysql-source`, `bq-dest`, and `OBJECT_ID`. Those are appropriate for a tutorial, but a production runbook should include a preceding step to create or look up connection profiles and stream object IDs.
