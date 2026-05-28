# Validation Summary: How to Choose Between Batch and Streaming Modes in Google Cloud Dataflow

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam Python SDK
- Google Cloud Pub/Sub
- BigQuery I/O for Apache Beam
- Cloud Scheduler
- Google Cloud CLI

## Sources Consulted
- Google Cloud Dataflow streaming pipelines documentation: https://docs.cloud.google.com/dataflow/docs/concepts/streaming-pipelines
- Google Cloud Dataflow Apache Beam programming model documentation: https://docs.cloud.google.com/dataflow/docs/concepts/beam-programming-model
- Google Cloud Dataflow pipeline options documentation: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow exactly-once documentation: https://cloud.google.com/dataflow/docs/concepts/exactly-once
- Google Cloud Dataflow streaming modes documentation: https://docs.cloud.google.com/dataflow/docs/guides/streaming-modes
- Google Cloud Dataflow classic templates REST documentation: https://docs.cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.templates/launch
- Google Cloud Dataflow running classic templates documentation: https://cloud.google.com/dataflow/docs/guides/templates/running-templates
- Google Cloud SDK `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Apache Beam Programming Guide: https://beam.apache.org/documentation/programming-guide/
- Apache Beam Pub/Sub I/O Python documentation: https://beam.apache.org/releases/pydoc/current/_modules/apache_beam/io/gcp/pubsub.html
- Apache Beam BigQuery I/O documentation: https://beam.apache.org/documentation/io/built-in/google-bigquery/
- Apache Beam trigger module documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.transforms.trigger.html

## Issues Found
- The Python examples used `json.loads` without importing `json`. Added `import json` to the relevant snippets.
- `ReadFromPubSub` emits message data as bytes by default when `with_attributes=False`, but the examples passed those bytes directly to `json.loads`. Added UTF-8 decoding before parsing JSON.
- The windowing explanation said the concept does not exist in batch. Beam supports windowing for bounded data too, so the text now says streaming pipelines depend on it more often because unbounded data is never fully available at once.
- The windowed count example attempted to count parsed JSON dictionaries with `Count.PerElement()`, which would fail because dictionaries are unhashable. The example now extracts an `event_type`, counts those values, and formats the results as BigQuery rows.
- The late-data example used decoded JSON fields without decoding or parsing the Pub/Sub message and referenced `beam.trigger.AccumulationMode`. The snippet now decodes and parses the message and imports `trigger.AccumulationMode` from the documented Beam trigger module.
- The Cloud Scheduler example called the Dataflow classic template launch endpoint without a template path. Added the required `gcsPath` query parameter and a JSON `Content-Type` header.

## Review Notes
The examples still use placeholder project, bucket, table, template, and transformation names. BigQuery writes assume the target tables already exist unless the reader adds schemas and create dispositions.
