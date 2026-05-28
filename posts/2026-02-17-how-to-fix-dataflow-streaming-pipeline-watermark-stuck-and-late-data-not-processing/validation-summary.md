# Validation Summary: How to Fix Dataflow Streaming Pipeline Watermark Stuck

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam
- Apache Beam PubsubIO
- Apache Beam Python SDK windowing and triggers
- Google Cloud CLI
- Cloud Logging

## Sources Consulted
- Google Cloud Dataflow streaming pipeline concepts: https://docs.cloud.google.com/dataflow/docs/concepts/streaming-pipelines
- Google Cloud Dataflow job metrics: https://docs.cloud.google.com/dataflow/docs/guides/using-monitoring-intf
- Google Cloud Dataflow slow or stuck streaming jobs troubleshooting: https://docs.cloud.google.com/dataflow/docs/guides/troubleshoot-slow-streaming-jobs
- Google Cloud CLI `gcloud beta dataflow metrics list`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/dataflow/metrics/list
- Google Cloud CLI `gcloud dataflow jobs run`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Apache Beam Java `PubsubIO` Javadocs: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/pubsub/PubsubIO.html
- Apache Beam Java `PubsubIO.Read` Javadocs: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/pubsub/PubsubIO.Read.html
- Apache Beam Python `ReadFromPubSub` source docs: https://beam.apache.org/releases/pydoc/current/_modules/apache_beam/io/gcp/pubsub.html
- Apache Beam Python `WindowInto` docs: https://beam.apache.org/releases/pydoc/current/apache_beam.transforms.html
- Apache Beam Python trigger docs: https://beam.apache.org/releases/pydoc/current/apache_beam.transforms.trigger.html
- Apache Beam timestamp utilities: https://beam.apache.org/releases/pydoc/current/_modules/apache_beam/utils/timestamp.html

## Issues Found
- The post used `gcloud dataflow metrics list`, but the documented metrics command is currently `gcloud beta dataflow metrics list`. Updated both metric commands.
- The Java Pub/Sub example used `PubsubIO.Read.withIdleTimeout(...)`, which is not present in the current Apache Beam `PubsubIO.Read` API. Replaced it with a documented `withTimestampAttribute(...)` example and clarified that idle behavior is source-specific.
- The post recommended `--additional-experiments=watermark_idle_timeout_ms=120000`, but this is not a documented Dataflow pipeline option or experiment in the official CLI docs. Removed the recommendation and replaced it with guidance to use source-specific idle-partition behavior or custom source watermark estimation.
- The Python Pub/Sub example did not configure event-time extraction. Added the documented `timestamp_attribute` parameter.
- The old-event filtering example referenced `Metrics.counter(...)` without defining `Metrics`. Updated it to `beam.metrics.Metrics.counter(...)`.
- The allowed lateness example used `beam.utils.timestamp.Duration.of(3600)`. Although this can work, the documented Python `WindowInto` parameter accepts seconds directly, so the example now uses `allowed_lateness=3600`.
- The timestamp assignment example could imply that any payload field type works as a Beam timestamp. Updated the field name and comment to make the Unix-seconds requirement explicit.
- The custom source watermark example allowed the watermark to move backwards and subtracted slack from the minimum timestamp. Updated it to keep the watermark monotonic and avoid subtracting from `TIMESTAMP_MIN_VALUE`.
- The troubleshooting diagram still referenced `watermark_idle_timeout`. Updated it to source-specific idle-partition handling.

## Review Notes
The guide is technically relevant and salvageable. Some Dataflow UI labels and watermark log messages can vary by runner version and job configuration, so the UI/logging guidance should be treated as troubleshooting direction rather than a guaranteed exact label in every job.
