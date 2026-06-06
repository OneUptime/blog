# Validation Summary: How to Configure OpenTelemetry for Google Cloud Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Trace
- Google Cloud Monitoring
- OpenTelemetry JavaScript SDK
- OpenTelemetry Collector
- Node.js
- Express.js
- Docker
- gcloud CLI
- Cloud Secret Manager

## Sources Consulted
- Google Cloud Run distributed tracing documentation: https://docs.cloud.google.com/run/docs/trace
- Google Cloud Run environment variables documentation: https://docs.cloud.google.com/run/docs/configuring/services/environment-variables
- Google Cloud Run container configuration and startup order documentation: https://cloud.google.com/run/docs/configuring/services/containers
- Google Cloud Run secrets documentation: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud Run Volume REST reference: https://docs.cloud.google.com/run/docs/reference/rest/v1/Volume
- Google Cloud Run SIGTERM sample / container lifecycle documentation: https://docs.cloud.google.com/run/docs/samples/cloudrun-sigterm-handler
- Google Cloud Node.js OpenTelemetry instrumentation sample: https://docs.cloud.google.com/trace/docs/setup/nodejs-ot
- Google Cloud OpenTelemetry Collector on Cloud Run documentation: https://docs.cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-cloud-run
- Google Cloud IAM roles for Cloud Trace: https://cloud.google.com/iam/docs/roles-permissions/cloudtrace
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- Current npm package metadata and installed package exports for `@opentelemetry/resources`, `@opentelemetry/sdk-node`, `@google-cloud/opentelemetry-cloud-trace-exporter`, `@google-cloud/opentelemetry-cloud-monitoring-exporter`, and `@google-cloud/opentelemetry-cloud-trace-propagator`

## Issues Found
- The post said Cloud Run only provides basic request logs and metrics and that distributed tracing requires additional tooling. Cloud Run now automatically generates request traces and populates W3C trace context, so the text was narrowed to application-level spans and custom metrics.
- The OpenTelemetry JavaScript snippets used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JS resources use `resourceFromAttributes(...)`, so both snippets were updated.
- The NodeSDK metrics configuration used the deprecated singular `metricReader` option. Updated it to `metricReaders: [metricReader]`.
- The Dockerfile used `npm ci --only=production`. Updated it to the current `npm ci --omit=dev` form.
- The Cloud Run deploy command repeated `--set-env-vars` for simple key/value pairs. Updated it to the documented comma-separated form.
- The sidecar YAML used a Kubernetes-style ConfigMap volume, which Cloud Run does not support. Replaced it with a Secret Manager-backed volume and added the required `run.googleapis.com/secrets` annotation.
- The sidecar dependency example did not include a startup probe for the dependent Collector container. Added a TCP startup probe on port 4317 so Cloud Run can honor the startup dependency correctly.
- The trace-context section described `X-Cloud-Trace-Context` as the Cloud Run load-balancer header to parse for correlation. Updated it to reflect that Cloud Run populates W3C `traceparent` by default and that the Google Cloud propagator is only needed for legacy `X-Cloud-Trace-Context` compatibility.

## Review Notes
The edited JavaScript examples were checked against the current npm packages by constructing the OpenTelemetry SDK, OTLP exporters, Cloud Trace exporter, and Google Cloud propagator in Node.js. The `gcloud` CLI was not installed in the local environment, so CLI flags were verified against official Google Cloud SDK documentation instead of local `--help` output.
