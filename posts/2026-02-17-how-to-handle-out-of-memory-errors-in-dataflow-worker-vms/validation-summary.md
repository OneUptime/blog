# Validation Summary: How to Handle Out-of-Memory Errors in Dataflow Worker VMs

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam Java SDK
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring
- BigQueryIO
- Cloud Bigtable client
- Compute Engine worker machine types

## Sources Consulted
- Google Cloud Dataflow: Troubleshoot out of memory errors: https://cloud.google.com/dataflow/docs/guides/troubleshoot-oom
- Google Cloud Dataflow: Work with pipeline logs: https://cloud.google.com/dataflow/docs/guides/logging
- Google Cloud Dataflow: Use Streaming Engine for streaming jobs: https://cloud.google.com/dataflow/docs/streaming-engine
- Google Cloud Dataflow: Configure worker VMs: https://cloud.google.com/dataflow/docs/guides/configure-worker-vm
- Google Cloud Dataflow: Dataflow service options: https://cloud.google.com/dataflow/docs/reference/service-options
- Google Cloud SDK: gcloud dataflow jobs run: https://cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Apache Beam Programming Guide: https://beam.apache.org/documentation/programming-guide/
- Apache Beam GroupByKey Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/GroupByKey.html
- Apache Beam View Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/View.html
- Apache Beam BigQueryIO Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/bigquery/BigQueryIO.html
- Google Compute Engine machine families: https://cloud.google.com/compute/docs/general-purpose-machines

## Issues Found
- The post said all `GroupByKey` values for a key must fit in worker memory. Dataflow documentation says grouped values are streamed from the backend and OOM usually happens when user code collects them into an in-memory object. Updated the explanation to match this behavior.
- The side input section said side inputs are loaded entirely into memory on each worker. Beam documents `View.asMap()` and `View.asList()` as appropriate when the side input fits in memory, while Dataflow Streaming Engine stores streaming side inputs outside worker memory with size limits. Narrowed the statement to avoid overgeneralizing.
- The BigQuery query example used an unqualified table name in a Standard SQL-style query. Updated it to use a fully qualified backticked table name and `.usingStandardSql()`.
- The unbounded streaming `GroupByKey` example claimed a global window with no trigger would buffer forever. Beam rejects `GroupByKey` on an unbounded `PCollection` in the global window without a non-default trigger or non-global windowing strategy at pipeline construction time. Updated the code comments.
- The worker memory logging command queried `gce_instance` logs using an instance ID text match, which is not a reliable Dataflow worker memory query. Replaced it with a Dataflow system-log query for OOM-related worker events and pointed readers to the Dataflow Memory utilization chart for worker memory metrics.
- The JVM tuning snippet used an undocumented `worker_jvm_options` experiment with `gcloud dataflow jobs run`. Replaced it with the documented `enable_google_cloud_heap_sampling` service option and reframed the section around profiling before tuning.
- The worker-log search command only returned `jsonPayload.message`. Updated it to filter worker logs explicitly and include both `textPayload` and `jsonPayload.message`.

## Review Notes
The code snippets are illustrative and omit surrounding imports, model classes, and helper functions such as `Event`, `Result`, `ToKVFn`, and `enrich`. The machine type memory values shown for the listed N1 machine types match Compute Engine documentation. Streaming Engine is only relevant to streaming jobs, and its defaults vary by SDK and version.
