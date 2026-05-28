# Validation Summary: How to Handle Late Data in Dataflow with Allowed Lateness and Watermarks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam Java SDK
- Pub/Sub
- Cloud Monitoring
- gcloud CLI
- Streaming windowing, watermarks, triggers, and allowed lateness

## Sources Consulted
- Apache Beam Programming Guide: Watermarks and late data, triggers, allowed lateness, and state garbage collection: https://beam.apache.org/documentation/programming-guide/
- Google Cloud Dataflow Pub/Sub source documentation: https://cloud.google.com/dataflow/docs/concepts/streaming-with-cloud-pubsub
- Google Cloud Monitoring metrics list for Dataflow metrics: https://cloud.google.com/monitoring/api/metrics_gcp_d_h
- Google Cloud SDK reference for Dataflow metrics commands: https://cloud.google.com/sdk/gcloud/reference/beta/dataflow/metrics
- Google Cloud Monitoring filter documentation: https://cloud.google.com/monitoring/api/v3/filters

## Issues Found
- The post claimed a side output after windowing could capture elements dropped for exceeding allowed lateness. Beam drops those elements before downstream transforms receive them, so I replaced the example with an archive-before-windowing pattern for reconciliation.
- The post described `system_lag` as the difference between the current watermark and wall clock time. Cloud Monitoring defines `job/system_lag` as the maximum time an item has been processing or waiting to be processed; the watermark-related metric is data watermark age. I corrected the wording and command.
- The post said allowed lateness should always be paired with late firing triggers because late data otherwise updates state but never emits. Beam's default trigger emits again for late data when allowed lateness is set, but custom triggers can suppress late updates if they do not define late firings. I narrowed the guidance to custom triggers.
- The gcloud metrics command used the non-beta command and filtered for `name.name=system_lag`. The official SDK reference documents Dataflow metrics under `gcloud beta dataflow metrics`, and service metrics are easier to inspect by listing service metrics and filtering output for watermark or lag names.

## Review Notes
The Java snippets are illustrative and omit imports and pipeline setup, but the Beam APIs used for fixed windows, allowed lateness, `AfterWatermark`, late firings, accumulating panes, `PubsubIO`, `Flatten`, `TextIO`, and `Count.perKey()` are current.
