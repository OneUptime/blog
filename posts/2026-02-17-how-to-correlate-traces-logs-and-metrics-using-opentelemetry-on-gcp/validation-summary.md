# Validation Summary: How to Correlate Traces Logs and Metrics Using OpenTelemetry on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Platform
- OpenTelemetry Python
- Cloud Trace
- Cloud Logging
- Cloud Monitoring
- Google Cloud CLI
- Python logging

## Sources Consulted
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Logs SDK docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/_logs.html
- OpenTelemetry Python logging instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- Google Cloud OpenTelemetry Cloud Trace exporter docs: https://google-cloud-opentelemetry.readthedocs.io/en/latest/cloud_trace/cloud_trace.html
- Google Cloud OpenTelemetry Cloud Monitoring exporter docs: https://google-cloud-opentelemetry.readthedocs.io/en/latest/cloud_monitoring/cloud_monitoring.html
- Google Cloud OpenTelemetry Cloud Monitoring exporter source docs: https://google-cloud-opentelemetry.readthedocs.io/en/latest/_modules/opentelemetry/exporter/cloud_monitoring.html
- Google Cloud OpenTelemetry Prometheus exemplar example: https://google-cloud-opentelemetry.readthedocs.io/en/latest/examples/prometheus_exemplars/README.html
- Cloud Logging structured logging docs: https://cloud.google.com/logging/docs/structured-logging
- Cloud Logging query language docs: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- gcloud logging metrics create reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create

## Issues Found
- The post implied trace ID and span ID are shared across all three signals. Metrics do not carry trace/span context in the same way logs do; metric correlation is usually through shared attributes or exemplars when supported. Updated the explanation and architecture diagram accordingly.
- The post implied the direct Python Cloud Monitoring exporter would create trace-linked exemplars from the shown OpenTelemetry histogram recording. The current exporter converts data points to Cloud Monitoring time series but does not preserve exemplar data. Updated the metrics discussion and the code comment to avoid promising exemplar links for that path.
- The setup snippet used `opentelemetry.sdk._logs.LoggingHandler`, which current OpenTelemetry Python source marks as deprecated in favor of the logging instrumentation package. Updated the example to use `opentelemetry.instrumentation.logging.LoggingInstrumentor` and set the OpenTelemetry logger provider globally.
- The application snippet used `trace.StatusCode.ERROR`. While this can work, the documented import is `StatusCode` from `opentelemetry.trace`. Updated the snippet to import and use `StatusCode` directly.
- The log-based metrics section said the metric automatically correlates with traces and preserves trace context. Log-based metrics count matching entries and do not themselves preserve per-entry trace links. Updated the wording to say the source logs contain trace context and the same filter can be used in Logs Explorer.
- The Cloud Logging query for error logs with trace context used `jsonPayload.trace_id!=""`, which does not match the Cloud Logging `LogEntry.trace` field populated by the structured logging special field. Updated it to `trace:*`.

## Review Notes
- The `gcloud logging metrics create` command and its `--description`, `--log-filter`, and `--bucket-name` flags match the current gcloud reference.
- The Cloud Logging special fields `logging.googleapis.com/trace`, `logging.googleapis.com/spanId`, and `logging.googleapis.com/trace_sampled` match the structured logging documentation.
- Python code fences were syntax-checked with `ast.parse` using `python3`; runtime execution was not attempted because the required Google Cloud and OpenTelemetry packages are not installed in this workspace.
