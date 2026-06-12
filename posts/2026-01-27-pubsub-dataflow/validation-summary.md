# Validation Summary: How to Use Pub/Sub with Dataflow

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Dataflow
- Apache Beam Python SDK
- Apache Beam windowing, triggers, and watermarks
- BigQuery streaming writes
- gcloud CLI
- OneUptime monitoring

## Sources Consulted
- Apache Beam Python Pub/Sub I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Apache Beam Programming Guide, windowing/triggers/allowed lateness: https://beam.apache.org/documentation/programming-guide/
- Apache Beam trigger source/API documentation: https://beam.apache.org/releases/pydoc/current/_modules/apache_beam/transforms/trigger.html
- Google Cloud Dataflow Pub/Sub best practices: https://docs.cloud.google.com/dataflow/docs/concepts/streaming-with-cloud-pubsub
- Google Cloud Dataflow exactly-once documentation: https://docs.cloud.google.com/dataflow/docs/concepts/exactly-once
- Google Cloud Dataflow streaming modes documentation: https://docs.cloud.google.com/dataflow/docs/guides/streaming-modes
- Google Cloud Dataflow pipeline options reference: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow pipeline update documentation: https://docs.cloud.google.com/dataflow/docs/guides/updating-a-pipeline
- Google Cloud Dataflow BigQuery write guidance: https://docs.cloud.google.com/dataflow/docs/guides/write-to-bigquery
- Apache Beam BigQuery I/O documentation: https://beam.apache.org/documentation/io/built-in/google-bigquery/
- Google Cloud SDK `gcloud pubsub topics update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/update
- Google Cloud Pub/Sub schema publishing documentation: https://docs.cloud.google.com/pubsub/docs/publish-topics-schema
- Apache Beam downloads / current SDK version: https://beam.apache.org/get-started/downloads/
- Dataflow Apache Beam runtime support: https://docs.cloud.google.com/dataflow/docs/support/beam-runtime-support
- PyPI apache-beam package page: https://pypi.org/project/apache-beam/
- PyPI google-cloud-pubsub package page: https://pypi.org/project/google-cloud-pubsub/
- PyPI google-cloud-bigquery package page: https://pypi.org/project/google-cloud-bigquery/

## Issues Found
- The introduction and Pub/Sub comments overstated exactly-once semantics as a subscription property. Updated the wording to match Dataflow's default exactly-once processing mode and its Pub/Sub connector deduplication behavior.
- The Avro schema declared `timestamp` as `long`, while later examples used ISO-8601 timestamp strings. Changed the schema field to `string` so the examples are internally consistent.
- The requirements block was marked as Python and used outdated 2023 package versions. Changed the fence to `text` and updated the package pins to current verified releases.
- `ParseEventFn` described the Beam timestamp parameter as coming only from Pub/Sub attributes. Clarified that it is the Beam element timestamp, sourced from `timestamp_attribute` when configured or the Pub/Sub publish timestamp otherwise.
- The aggregation example used `GroupByKey` plus `len(list(...))` and wrote processing time as `window_end`. Replaced it with `Count.PerKey()` and formatted the actual Beam window end.
- The BigQuery write example used legacy streaming inserts while claiming production exactly-once behavior. Changed it to `WriteToBigQuery.Method.STORAGE_WRITE_API`, which Google Cloud documents as the recommended exactly-once streaming write method.
- The late-data timestamp parser did not reliably handle `Z` suffixed ISO strings on all Beam-supported Python versions. Normalized `Z` to `+00:00` before parsing.
- The late-data BigQuery example declared `window_start` and `window_end` fields but emitted only an integer count. Added a formatter that outputs dictionaries matching the declared schema.
- The retry example emitted successful records as `TaggedOutput('main', ...)` despite configuring `main=` in `with_outputs`. Changed successful records to use the normal main output.
- The Dataflow update text described updates as "in-place" and "no data loss." Revised it to match the official replacement-job update model for streaming jobs.
- The autoscaling options example duplicated Streaming Engine enablement through an experiment-style setting. Removed the duplicate and kept the current `--enable_streaming_engine` option.

## Review Notes
- The local environment did not have `gcloud` or `apache_beam` installed, so CLI/API verification was performed against official documentation rather than local command execution.
- All Python code blocks were parsed with `python3` AST checks after edits; dependency-level execution was not possible without installing Apache Beam.
