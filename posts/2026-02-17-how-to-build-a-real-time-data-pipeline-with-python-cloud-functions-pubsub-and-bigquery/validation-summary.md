# Validation Summary: How to Build a Real-Time Data Pipeline with Python Cloud Functions Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Run functions / Cloud Functions Gen 2
- Eventarc
- BigQuery
- Python
- Google Cloud CLI
- Google Cloud Python client libraries

## Sources Consulted
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Cloud Run functions retry documentation: https://docs.cloud.google.com/functions/docs/bestpractices/retries
- Cloud Run functions Pub/Sub/Eventarc tutorial: https://docs.cloud.google.com/run/docs/tutorials/pubsub-eventdriven
- Cloud Run event trigger documentation: https://docs.cloud.google.com/run/docs/triggering/trigger-with-events
- gcloud functions deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- BigQuery schema documentation: https://docs.cloud.google.com/bigquery/docs/schemas
- BigQuery JSON data documentation: https://docs.cloud.google.com/bigquery/docs/json-data
- BigQuery streaming insert documentation: https://docs.cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- BigQuery Python Client.insert_rows_json reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client

## Issues Found
- The setup commands used `my_project` as a project ID, which is not a valid Google Cloud project ID format and was inconsistent with the later examples. Changed the commands to use `my-gcp-project`.
- The error handler inserted into `analytics.pipeline_errors`, but the setup section did not create that table. Added a `bq mk --table` command for the error log table.
- The Cloud Function code hardcoded the project ID even though the deploy command set `GCP_PROJECT`. Updated the code to read `GCP_PROJECT` from the environment with the existing sample project as a fallback.
- The BigQuery insertion comment said raising would trigger a Pub/Sub retry, but Gen 2 functions deployed with `gcloud functions deploy` do not retry failed event invocations by default. Added `--retry` to the deploy command and clarified the comment.
- The batching example used a global in-memory buffer in Cloud Functions, which is not durable and can lose events after the triggering Pub/Sub message is acknowledged. Replaced it with a batch insert helper for messages that already contain multiple events.
- The dead-letter queue section only created a dead-letter topic, but Pub/Sub dead-lettering is configured on a subscription and requires IAM permissions for the Pub/Sub service account. Added commands to grant IAM roles and update the Eventarc-created Pub/Sub subscription.
- The post used both `my-project` and `my-gcp-project` in table IDs. Standardized the examples on `my-gcp-project`.

## Review Notes
The examples remain tutorial-oriented and omit production concerns such as schema evolution, idempotency beyond best-effort insert IDs, BigQuery Storage Write API usage for very high throughput, and deployment of the dead-letter handler. The corrected streaming insert examples use `insert_rows_json`, which is current, but BigQuery documentation recommends considering the Storage Write API for new high-throughput streaming workloads.
