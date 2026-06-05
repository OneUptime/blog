# Validation Summary: How to Set Up a Two-Tier Collector Architecture (Agent + Gateway)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OTLP gRPC and OTLP HTTP
- Collector agent-to-gateway deployment pattern
- Tail-based sampling
- Collector load-balancing exporter
- Kubernetes DaemonSet, Deployment, Service, and HorizontalPodAutoscaler
- Prometheus Remote Write
- Jaeger
- Loki OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector redaction processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector metricstransform processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry Collector official releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- Updated the Collector image from `0.93.0` to `0.153.0`, the latest official Collector release available during review, to avoid publishing an outdated deployment example.
- Replaced deprecated internal telemetry `metrics.address` configuration with the current `metrics.readers.pull.exporter.prometheus` structure.
- Added trace-aware routing with the `loadbalancing` exporter and a headless Kubernetes Service because horizontally scaled gateway tail sampling requires all spans for a trace to reach the same gateway instance.
- Fixed the `loadbalancing` DNS resolver `port` value to a string, which is required by the current Collector config schema.
- Replaced the unsupported `loki` exporter with `otlphttp/loki`, because the current contrib distribution does not include a `loki` exporter.
- Fixed the redaction processor example by setting `allow_all_keys: true`; with `allow_all_keys: false` and no `allowed_keys`, attributes would be removed before `blocked_values` could mask sensitive values.
- Corrected the `metricstransform` regex substitution syntax from `$1` to `$${1}` and added a capture group so the example is valid Collector config.
- Moved `tail_sampling` before `batch` in the gateway traces pipeline so sampled traces are batched after the sampling decision.
- Added TLS settings to the gateway OTLP receiver and mounted a matching Kubernetes Secret, aligning it with the agent exporters that use TLS.
- Updated monitoring metric guidance to include current queue capacity and enqueue failure metrics.

## Review Notes
Validated the extracted agent and gateway Collector configs with `otel/opentelemetry-collector-contrib:0.153.0 validate`. Parsed the Kubernetes deployment and HPA YAML snippets successfully. The example still uses placeholder backend endpoints, tokens, and TLS Secret names that must be replaced for a real deployment.
