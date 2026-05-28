# Validation Summary: How to Configure OpenTelemetry Collector to Send Traces to Google Cloud Trace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Trace
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib `googlecloud` exporter
- OTLP over gRPC and HTTP
- GKE / Kubernetes Deployments and Services
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript / Node.js SDK
- Tail sampling, filtering, attributes, batch, memory limiter, and resource detection processors
- Docker Compose
- Prometheus scraping for Collector internal metrics

## Sources Consulted
- OpenTelemetry Collector Google Cloud exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Python exporters docs: https://opentelemetry.io/docs/languages/python/exporters/
- Google Cloud Trace OpenTelemetry setup docs: https://cloud.google.com/trace/docs/setup

## Issues Found
- The `googlecloud` exporter examples used `retry_on_failure`, but the current contrib exporter exposes `timeout` and `sending_queue` settings and does not include `retry_on_failure` in its configuration struct. Replaced the retry block with `timeout: 12s` and `sending_queue: enabled: true`.
- The Node.js example imported and instantiated `Resource` directly. Current OpenTelemetry JavaScript docs show `resourceFromAttributes` for adding resource attributes in code. Updated the import and resource construction.
- The tail sampling section did not mention the routing requirement for replicated collectors. Added a note that all spans for a given trace must reach the same collector instance.
- The filter processor example used the legacy `traces.span` configuration and the deprecated `http.target` attribute. Updated it to the current `trace_conditions` form using `span.attributes["url.path"]` and added `error_mode: ignore`.
- The Collector internal metrics example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to the current Prometheus pull reader configuration with `host` and `port`.

## Review Notes
The Kubernetes example still uses the `latest` Collector image tag, which is valid YAML but not ideal for production reproducibility. Pinning a tested Collector version would be a useful future improvement.
