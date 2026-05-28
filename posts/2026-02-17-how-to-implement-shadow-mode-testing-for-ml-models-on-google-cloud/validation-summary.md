# Validation Summary: How to Implement Shadow Mode Testing for ML Models on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI SDK for Python (`google-cloud-aiplatform`)
- Google Cloud Pub/Sub Python client
- Google Cloud BigQuery Python client
- GoogleSQL for BigQuery
- Flask
- Python

## Sources Consulted
- Vertex AI SDK for Python `Endpoint` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI SDK for Python `Model` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- BigQuery Python client `Client.insert_rows_json` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- Pub/Sub Python publisher client reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Pub/Sub Python subscriber `Message` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- BigQuery approximate aggregate functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions
- BigQuery JSON functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- BigQuery lexical structure and trailing comma reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical

## Issues Found
- The automated evaluation Python example called `json.dumps()` without importing `json`. Added `import json` so the example is syntactically complete.
- The BigQuery SQL examples used deprecated `JSON_EXTRACT_SCALAR`. Replaced those calls with the current `JSON_VALUE` function, which is the recommended standard extractor for scalar JSON values.
- The Pub/Sub subscriber acknowledged messages before checking whether the BigQuery insert had errors. Moved `message.ack()` after a successful insert and added `message.nack()` on insert errors so failed logging can be retried.

## Review Notes
The Vertex AI `Endpoint.create`, `Model.deploy`, `Endpoint.predict`, Pub/Sub publish, and BigQuery `insert_rows_json` usage matches the current Python client documentation. BigQuery permits trailing commas in a `SELECT` column list, so the existing SQL trailing commas are valid GoogleSQL.
