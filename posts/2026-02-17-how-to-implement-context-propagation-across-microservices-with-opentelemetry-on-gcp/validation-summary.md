# Validation Summary: How to Use Context Propagation Across Microservices with OpenTelemetry on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Platform
- Cloud Trace
- OpenTelemetry
- W3C Trace Context
- Python
- Flask
- requests
- gRPC
- Pub/Sub
- Cloud Tasks
- Node.js
- Express
- axios

## Sources Consulted
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Google Cloud Trace context documentation: https://docs.cloud.google.com/trace/docs/trace-context
- Google Cloud OpenTelemetry Python Cloud Trace exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/stable/_autosummary/opentelemetry.exporter.cloud_trace.html
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/requests.html
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript NodeTracerProvider API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- OpenTelemetry JavaScript HTTP instrumentation API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_instrumentation-http.HttpInstrumentation.html
- Google Cloud Pub/Sub OpenTelemetry tracing documentation: https://docs.cloud.google.com/pubsub/docs/open-telemetry-tracing
- Google Cloud Tasks HTTP task sample documentation: https://docs.cloud.google.com/tasks/docs/samples/cloud-tasks-create-http-task
- Google Cloud Tasks Python HttpRequest reference: https://docs.cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.HttpRequest

## Issues Found
- The post described `tracestate` as containing data like the GCP project for Cloud Trace and used `tracestate: gcp=project-id` as an example. W3C defines `tracestate` as optional vendor-specific trace data, and Google Cloud configures the Cloud Trace project through exporter/application credentials rather than requiring a propagated GCP project value in `tracestate`. Updated the description and example.
- The Node.js setup used `provider.addSpanProcessor(...)`, which is not part of the current `NodeTracerProvider` API shape shown in current OpenTelemetry JS docs. Updated the sample to pass `spanProcessors` in the provider configuration.
- The Node.js route used `tracer.startSpan(...)` for a manual span but did not make that span active, so downstream auto-instrumented HTTP requests would not reliably be children of `process-order`. Updated the route to use `tracer.startActiveSpan(...)`.
- The Cloud Tasks / Cloud Scheduler section claimed the sample covered both services, but the code only creates a Cloud Tasks HTTP task. Tightened the wording to Cloud Tasks only.

## Review Notes
The remaining examples are technically sound as illustrative snippets, assuming current OpenTelemetry packages are installed and Google Cloud Application Default Credentials or explicit project configuration are available. The post could later mention service resource attributes and sampling configuration, but those are completeness improvements rather than correctness fixes.
