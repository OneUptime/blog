# Validation Summary: How to Send OpenTelemetry Metrics to Google Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry Collector Contrib
- OTLP gRPC and HTTP receivers
- Google Cloud Monitoring
- OpenTelemetry Collector `googlecloud` exporter
- OpenTelemetry Collector `resourcedetection`, `resource`, and `batch` processors
- Python OpenTelemetry metrics API and SDK
- Python OTLP metrics exporter
- Python Google Cloud Monitoring metrics exporter

## Sources Consulted
- Google Cloud Monitoring user-defined metrics overview: https://docs.cloud.google.com/monitoring/custom-metrics
- Google Cloud Monitoring quotas and limits: https://docs.cloud.google.com/monitoring/quotas
- Google Cloud Monitoring API user-defined metrics guide: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- OpenTelemetry Collector `googlecloud` exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/googlecloudexporter
- Google Cloud OpenTelemetry Python Cloud Monitoring exporter API docs: https://google-cloud-opentelemetry.readthedocs.io/en/latest/cloud_monitoring/cloud_monitoring.html
- Google Cloud collector-based instrumentation samples overview: https://docs.cloud.google.com/stackdriver/docs/instrumentation/setup/sample-overview
- Google Cloud OpenTelemetry Collector deployment docs for resource detection examples: https://docs.cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-cos
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The Collector download example pinned `otelcol-contrib` v0.96.0, which is outdated for a 2026 tutorial. Updated the example to v0.153.0 and verified the Linux tarball exists and runs.
- The prerequisites said v0.90.0 or later was recommended. Reworded this to recommend a current `otelcol-contrib` release because the key requirement is that the distribution includes the `googlecloud` exporter.
- The Collector metric prefix comment said it used the service name as a prefix. The `googlecloud` exporter uses a configured static `metric.prefix`, so the comment now says it is a custom metric type prefix.
- The Python OTLP example imported `opentelemetry.exporter.otlp.proto.grpc.metric_exporter` but did not list the required `opentelemetry-exporter-otlp-proto-grpc` package. Added the missing install command.
- The direct exporter comment implied project auto-detection from `GOOGLE_CLOUD_PROJECT` or metadata server while passing `project_id`. Reworded it to state that the exporter uses Application Default Credentials for authentication.
- The post said the direct exporter interval was constrained by a Cloud Monitoring 10-second minimum. Current Cloud Monitoring API limits require point end times for the same time series to be at least 5 seconds apart, while the Python exporter has a 10-second internal write interval safeguard. Updated the comments and pitfalls section accordingly.
- The Viewing Metrics section implied all OpenTelemetry metrics would appear under `custom.googleapis.com/opentelemetry`. The direct Python exporter defaults to `workload.googleapis.com` unless `prefix` is set, so the wording now distinguishes the Collector configuration from the direct exporter default.
- The "Resource Detection" label was plain text rather than a Markdown heading. Changed it to `## Resource Detection` so the section renders correctly.

## Review Notes
- The Collector YAML was validated with `otelcol-contrib validate` using v0.153.0.
- The Python OTLP example was smoke-tested for imports and setup using current packages installed into a temporary target directory. Export failed as expected because no local Collector was running.
- The direct Python exporter imports were verified with current packages. Instantiating the exporter requires valid Application Default Credentials, which matches the post's authentication prerequisites.
