# Validation Summary: How to Build a Serverless IoT Data Ingestion Pipeline Using Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Pub/Sub
- Google Cloud Firestore
- Google BigQuery
- Google Cloud Storage
- Python 3.11
- Google Cloud CLI and bq CLI

## Sources Consulted
- Google Cloud Functions deploy CLI reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run functions CloudEvent handler documentation: https://cloud.google.com/functions/docs/writing/write-event-driven-functions
- Cloud Pub/Sub CloudEvent Python sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Cloud Run functions Python dependency documentation: https://cloud.google.com/functions/docs/writing/specifying-dependencies-python
- Cloud Run functions best practices: https://cloud.google.com/functions/docs/bestpractices/tips
- Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- gcloud Pub/Sub publish reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/publish
- BigQuery streaming insert Python sample: https://cloud.google.com/bigquery/docs/samples/bigquery-table-insert-rows
- BigQuery schema/table creation documentation: https://docs.cloud.google.com/bigquery/docs/schemas
- Cloud Run functions pricing overview: https://cloud.google.com/functions
- Pub/Sub pricing documentation: https://cloud.google.com/pubsub/pricing

## Issues Found
- The post claimed the pipeline used only Pub/Sub and Cloud Functions, but the code also depends on Firestore, BigQuery, and Cloud Storage. Updated the wording and prerequisites to reflect those required services.
- The post implied the whole pipeline costs nothing when idle. Updated the wording to specify no idle compute cost for the function pipeline, because storage-backed services can still have storage-related costs.
- The validation function compared the timestamp without first checking that it was numeric. Added a type check so malformed timestamps are rejected cleanly instead of causing a function error.
- Pub/Sub publish calls returned futures but did not wait for them before the CloudEvent function returned. Added `.result()` calls so publish operations complete during the invocation.
- Pub/Sub attributes were passed with explicit keyword arguments plus unpacked incoming attributes, which could fail if keys collided. Updated the examples to merge attributes before publishing.
- One dead-letter publish could send a non-string `device_id` attribute for invalid messages. Converted the value to a string because Pub/Sub attributes must be strings.
- The storage example used naive UTC datetime helpers. Updated it to use timezone-aware UTC timestamps.
- The deploy step omitted `requirements.txt` files for the Python source directories. Added minimal dependency files required by the examples.
- The end-to-end test message used a fixed 2024 timestamp, which the post's own 24-hour validation window would reject on 2026-05-28. Updated the command to generate the current timestamp at publish time.

## Review Notes
Local `gcloud` verification was not possible because the Google Cloud CLI is not installed in this workspace. CLI syntax and behavior were checked against official Google Cloud reference documentation instead. No live GCP deployment or end-to-end cloud execution was performed.
