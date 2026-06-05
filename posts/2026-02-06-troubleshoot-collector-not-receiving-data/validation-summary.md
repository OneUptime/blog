# Validation Summary: How to Troubleshoot the OpenTelemetry Collector Not Receiving Data

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP receivers
- Collector TLS and authentication configuration
- Kubernetes Services and NetworkPolicies
- Docker, Kubernetes, and Linux network diagnostics
- Prometheus alerting for Collector receiver metrics
- telemetrygen

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- Memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- Bearer token authenticator README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/README.md
- telemetrygen README and CLI help: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- Replaced deprecated `logging` exporter examples with the current `debug` exporter and validated the corrected Collector snippets against `otelcol-contrib` 0.153.0.
- Made the initial debug logging config a complete minimal Collector config by adding a trace pipeline and debug exporter.
- Corrected the bearer token authentication example. The configured `bearertokenauth` extension checks `Authorization: Bearer <token>` by default, so the application header example now sends `Authorization=Bearer%20your-secret-api-key`.
- Completed the authentication pipeline by adding a debug exporter so the snippet validates as a runnable Collector config.
- Fixed a Kubernetes deployment example that defined `OTEL_EXPORTER_OTLP_ENDPOINT` twice in the same container environment list.
- Changed the NetworkPolicy namespace selector example to use the standard `kubernetes.io/metadata.name` namespace label instead of an application label that would not normally exist on namespaces.
- Updated Prometheus alert expressions to use the `_total` counter names exposed by Prometheus scraping and removed the undocumented `otelcol_receiver_failed_spans` metric.
- Changed the TLS example's insecure alternative so it no longer appears as a second duplicate top-level `receivers` key in the same YAML document.

## Review Notes
The post is technically relevant and accurate after the fixes. Some shell and Kubernetes examples are intentionally environment-specific placeholders, but the Collector-specific configuration and metric names now match current official documentation.
