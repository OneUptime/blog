# Validation Summary: How to Implement the CQRS Pattern with Cloud Pub/Sub and BigQuery on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Google Cloud Pub/Sub
- BigQuery
- BigQuery subscriptions for Pub/Sub
- Python Google Cloud client libraries
- Flask
- PostgreSQL
- CQRS architecture

## Sources Consulted
- Google Cloud SQL for PostgreSQL create instance documentation: https://docs.cloud.google.com/sql/docs/postgres/create-instance
- gcloud sql instances create reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- gcloud sql databases create reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/databases/create
- Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Pub/Sub BigQuery subscription documentation: https://docs.cloud.google.com/pubsub/docs/create-bigquery-subscription
- Pub/Sub Python publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Pub/Sub Python subscriber quickstart: https://docs.cloud.google.com/pubsub/docs/publish-receive-messages-client-library
- BigQuery DDL reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery data types reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types
- BigQuery DML limitations: https://docs.cloud.google.com/bigquery/docs/data-manipulation-language
- BigQuery Python Client reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- Pub/Sub pricing: https://cloud.google.com/pubsub/pricing

## Issues Found
- The Cloud SQL instance command used the older custom tier form. Updated it to the current documented `--cpu`, `--memory`, and `--edition ENTERPRISE` form for Cloud SQL Enterprise instances.
- The command handler used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- Pub/Sub publish calls returned futures but did not wait for publish completion. Updated the examples to call `publish_future.result(timeout=30)` so failures surface in the command handler.
- The Pub/Sub dead-letter subscription referenced `order-events-dlq` without creating it. Added a `gcloud pubsub topics create order-events-dlq` command.
- The BigQuery subscription example used `my-project:order_analytics.raw_events`, but the documented `gcloud` format is `PROJECT_ID.DATASET_ID.TABLE_ID`. Changed it to `my-project.order_analytics.raw_events`.
- The optional BigQuery subscription example used `--write-metadata` but did not provide the required destination table schema. Added a `raw_events` table with `subscription_name`, `message_id`, `publish_time`, `data`, and `attributes` fields.
- The projection service omitted the `datetime` import. Added `from datetime import datetime, timezone`.
- The projection service inserted rows with `insert_rows_json` and then updated the same table with DML. BigQuery blocks DML modifications of rows recently written through `tabledata.insertAll`, so the example could fail for status updates soon after order creation. Changed the insert path to `load_table_from_json`, which avoids the recent streaming row DML limitation in the tutorial flow.
- The Flask `POST /api/orders` example called an async command handler without `await`. Changed the route to `async def` and awaited the handler.
- The pricing section used outdated fixed message-count and query-price figures. Replaced them with current high-level pricing descriptions: Pub/Sub throughput-based pricing, BigQuery free storage/query tiers, and per-TiB or capacity pricing.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK reference documentation instead of local `--help` output.
- For production CQRS systems, a transactional outbox is usually needed to avoid losing events if the database transaction commits and Pub/Sub publishing fails afterward.
