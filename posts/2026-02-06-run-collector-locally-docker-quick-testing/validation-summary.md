# Validation Summary: How to Run the Collector Locally in Docker for Quick Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Docker image
- Docker and Docker Compose
- Jaeger
- Prometheus
- telemetrygen
- OTLP over gRPC and HTTP
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Docker install documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib repository and component list: https://github.com/open-telemetry/opentelemetry-collector-contrib
- Jaeger latest getting started documentation: https://www.jaegertracing.io/docs/latest/getting-started/
- Jaeger deployment/API port documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Prometheus configuration validation via `promtool check config`
- Local CLI validation with `otel/opentelemetry-collector-contrib:latest` (`0.153.0`) and `telemetrygen:latest`

## Issues Found
- The Docker Compose Jaeger service used `jaegertracing/all-in-one:latest`, which currently runs Jaeger v1 and emits an end-of-life warning. Updated it to the current Jaeger v2 image `cr.jaegertracing.io/jaegertracing/jaeger:2.19.0`.
- The Collector exported traces to `jaeger:14250` using the OTLP exporter. Jaeger port `14250` is for Jaeger model.proto gRPC, not OTLP. Updated the exporter to send OTLP/gRPC to `jaeger:4317`.
- The Collector config used the deprecated `otlp` exporter alias. Updated it to `otlp_grpc/jaeger` to avoid the latest Collector deprecation warning.
- The Compose file published Jaeger OTLP ports that would conflict with the Collector's host port mappings. Removed the unnecessary Jaeger `4317` and `4318` host mappings because the Collector reaches Jaeger over the Compose network.
- The Compose file mounted `prometheus.yaml` but did not provide the required Prometheus scrape configuration. Added a minimal `prometheus.yaml` that scrapes `otel-collector:8889`.
- The Compose file mapped the zPages port, but the shown Collector config did not enable the zPages extension. Removed the unused `55679` mapping.
- The introduction promised persistent storage, but the post does not configure storage. Removed that claim.
- The core distribution description was too narrow and claimed it only includes a few essential components. Reworded it to describe core as a smaller curated distribution and contrib as a broader distribution.
- The Docker networking guidance blurred same-network service discovery with `host.docker.internal`. Clarified when to use the Compose service name versus `host.docker.internal`.
- The SIGHUP reload section claimed reloads happen without dropping in-flight telemetry. Reworded the claim to avoid overpromising and to note that full restarts remain the cleanest local test path.

## Review Notes
- Verified the custom Collector snippets with `otelcol-contrib validate`.
- Verified the Prometheus scrape config with `promtool check config`.
- Started a temporary Docker Compose stack with the corrected Collector, Jaeger, and Prometheus services and sent a test trace with `telemetrygen`; the Collector accepted the trace successfully.
