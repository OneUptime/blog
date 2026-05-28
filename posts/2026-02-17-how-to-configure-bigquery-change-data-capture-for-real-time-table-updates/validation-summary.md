# Validation Summary: How to Configure BigQuery Change Data Capture for Real-Time Table Updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery Change Data Capture ingestion
- BigQuery Storage Write API
- Google Cloud Datastream
- gcloud CLI
- SQL DML and MERGE
- Python BigQuery client
- Node.js BigQuery Storage client

## Sources Consulted
- BigQuery CDC ingestion documentation: https://cloud.google.com/bigquery/docs/change-data-capture
- BigQuery Storage Write API streaming documentation: https://cloud.google.com/bigquery/docs/write-api-streaming
- BigQuery Storage Write API overview: https://cloud.google.com/bigquery/docs/write-api
- Datastream BigQuery destination documentation: https://cloud.google.com/datastream/docs/configure-bigquery-destination
- Datastream BigQuery destination overview: https://cloud.google.com/datastream/docs/destination-bigquery
- gcloud Datastream connection profile reference: https://cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- gcloud Datastream stream creation reference: https://cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Node.js BigQuery Storage client reference for managed writer CDC helpers: https://cloud.google.com/nodejs/docs/reference/bigquery-storage/latest/overview

## Issues Found
- The Storage Write API CDC example created a committed write stream. BigQuery CDC ingestion requires the default stream and protobuf ingestion, so the example was replaced with a default-stream managed writer example that includes `_CHANGE_TYPE` and `_CHANGE_SEQUENCE_NUMBER`.
- The Datastream stream command passed inline JSON to flags that expect YAML or JSON file paths. The example now writes `mysql-source-config.json` and `bigquery-destination-config.json` and passes those file paths.
- The Datastream JSON config used snake_case field names. The example now uses the documented camelCase fields such as `includeObjects`, `mysqlDatabases`, `singleTargetDataset`, `datasetId`, and `dataFreshness`.
- The Datastream stream command omitted the required backfill mode. The example now includes `--backfill-all`.
- The Datastream source connection profile used a private IP address without a connectivity option. The example now includes `--private-connection=PRIVATE_CONNECTION`.
- The explanation of Datastream `dataFreshness` incorrectly implied it controls merge job frequency and direct visibility timing. It now describes it as the maximum data staleness limit and notes that it does not control BigQuery merge job frequency.
- The DML example was described as processing events from Datastream, but Datastream-managed BigQuery replication applies changes directly. The wording now frames it as a custom non-native CDC implementation from Debezium or another change feed.
- The MERGE section did not mention that active native CDC-enabled tables do not support mutating DML. The section now clarifies that MERGE is for tables not actively receiving native CDC ingestion.
- The late-arriving changes example guarded UPSERTs by timestamp but allowed an older DELETE to remove newer data. The DELETE branch now also checks `source.last_updated > target.last_updated`.

## Review Notes
The remaining DML example is illustrative and still uses string interpolation, but the post already warns to use parameterized queries in production. The Datastream examples assume the placeholder private connection, source credentials, dataset, and project have already been created and granted the required permissions.
