# Validation Summary: How to Build an IoT Telemetry Pipeline on Google Cloud Using Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub schemas
- Pub/Sub dead-letter topics
- Dataflow
- Apache Beam Python SDK
- BigQuery
- Cloud Storage
- Cloud Functions
- Cloud Monitoring
- Eclipse Paho MQTT Python client
- Google Cloud CLI

## Sources Consulted
- Google Cloud Pub/Sub schema overview: https://docs.cloud.google.com/pubsub/docs/schemas
- Google Cloud Pub/Sub schema creation docs: https://cloud.google.com/pubsub/docs/create-schemas
- Google Cloud CLI `gcloud pubsub schemas create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/create
- Google Cloud CLI `gcloud pubsub topics update`: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/update
- Google Cloud CLI `gcloud pubsub topics publish`: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/publish
- Google Cloud Pub/Sub dead-letter topic docs: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub quotas and limits: https://docs.cloud.google.com/pubsub/quotas
- Google Cloud Pub/Sub Lite documentation: https://docs.cloud.google.com/pubsub/lite/docs
- Google Cloud Dataflow Python pipeline guide: https://docs.cloud.google.com/dataflow/docs/guides/create-pipeline-python
- Google Cloud Dataflow pipeline options: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow Pub/Sub streaming docs: https://docs.cloud.google.com/dataflow/docs/concepts/streaming-with-cloud-pubsub
- Google Cloud Dataflow pipeline options guide: https://cloud.google.com/dataflow/docs/guides/setting-pipeline-options
- Apache Beam BigQuery I/O connector docs: https://beam.apache.org/documentation/io/built-in/google-bigquery/
- BigQuery schema documentation: https://docs.cloud.google.com/bigquery/docs/schemas
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/

## Issues Found
- The architecture diagram showed Dataflow writing to Cloud Storage even though the tutorial only implements the BigQuery sink. Changed the label to "Optional archive" so the diagram no longer implies implemented functionality.
- The prerequisites omitted APIs commonly required for Dataflow jobs. Added Compute Engine API and Cloud Logging API.
- The Pub/Sub dead-letter subscription setup omitted the required IAM grants for the Pub/Sub service account. Added the `roles/pubsub.publisher` grant on the dead-letter topic and the `roles/pubsub.subscriber` grant on the source subscription.
- The Paho MQTT sample used the deprecated callback API style. Updated the client construction to `mqtt.CallbackAPIVersion.VERSION2` and adjusted the `on_connect` signature.
- The Dataflow sample used deprecated naive UTC datetime helpers and did not catch common conversion failures. Updated timestamp generation to timezone-aware UTC values and expanded parse error handling.
- The scaling section recommended Pub/Sub Lite, which was turned down on March 18, 2026. Replaced that recommendation with Pub/Sub or Google Cloud Managed Service for Apache Kafka.
- The scaling section claimed Pub/Sub handles millions of messages per second without configuration changes. Reworded it to account for regional throughput quotas and quota increase workflows.

## Review Notes
The examples remain illustrative and still require replacing placeholder project IDs, bucket names, broker hostnames, and service account permissions for a production deployment.
