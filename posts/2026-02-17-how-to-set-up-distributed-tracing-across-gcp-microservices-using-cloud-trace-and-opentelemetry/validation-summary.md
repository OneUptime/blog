# Validation Summary: How to Set Up Distributed Tracing Across GCP Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Trace
- Google Cloud Monitoring
- Google Cloud CLI
- OpenTelemetry
- Python
- Flask
- requests
- SQLAlchemy instrumentation
- Node.js
- Express
- Cloud Run metrics

## Sources Consulted
- Google Cloud Trace overview: https://docs.cloud.google.com/trace/docs/overview
- Google Cloud Trace Python instrumentation sample: https://docs.cloud.google.com/trace/docs/setup/python-ot
- Google Cloud Trace Node.js instrumentation sample: https://docs.cloud.google.com/trace/docs/setup/nodejs-ot
- Google Cloud Trace API reference: https://docs.cloud.google.com/trace/docs/reference
- Cloud Trace API v1 `projects.traces.list`: https://docs.cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list
- Cloud Trace API v1 `projects.traces.get`: https://docs.cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/get
- Google Cloud OpenTelemetry Python propagator docs: https://google-cloud-opentelemetry.readthedocs.io/en/latest/_autosummary/opentelemetry.propagators.cloud_trace_propagator.html
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JS Resource API docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_resources.Resource.html
- Google Cloud CLI `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring metrics reference for Cloud Run request latency: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Monitoring monitored resource reference for `cloud_run_revision`: https://docs.cloud.google.com/monitoring/api/resources

## Issues Found
- Added the missing `SQLAlchemyInstrumentor().instrument()` call to match the post's stated Flask, requests, and SQLAlchemy auto-instrumentation coverage.
- Replaced the Node.js `new Resource(...)` example with `resourceFromAttributes(...)`, because current OpenTelemetry JS exposes `Resource` as an interface and documents factory functions as the valid construction path.
- Fixed the Python span status example to import and use `Status(StatusCode.ERROR, ...)`, matching the current OpenTelemetry Python API documentation.
- Replaced unsupported `gcloud trace traces list` and `gcloud trace traces describe` examples with Cloud Trace API v1 `curl` calls authenticated by `gcloud auth print-access-token`.
- Replaced the invalid `cloudtrace.googleapis.com/http/server/latency` alerting metric and obsolete threshold flags with a current Cloud Run request latency alert using `run.googleapis.com/request_latencies`, `resource.labels.service_name`, `--aggregation`, `--duration`, and `--if`.
- Renamed the alerting section from trace-based alerts to latency-based alerts because Cloud Trace does not expose the example trace latency metric used by the original command.

## Review Notes
- Google Cloud's current Trace samples recommend collector or OTLP-based export where possible. The direct Cloud Trace exporter packages used in this post can still be used for in-process export scenarios, but a future update could show the collector/OTLP pattern as the preferred production architecture.
- The examples assume Cloud Trace API access, appropriate IAM roles, Application Default Credentials in the runtime environment, and Cloud Run when using the latency alert example.
