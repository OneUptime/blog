# Validation Summary: How to Use zPages for Live Debugging of the Collector

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector zPages extension
- OpenTelemetry Collector internal telemetry
- OpenTelemetry Collector filter, batch, memory_limiter, debug, OTLP, Prometheus, and prometheusremotewrite components
- Kubernetes Deployments, Services, and kubectl port-forward
- Docker Compose
- Bash, curl, watch, awk, and SSH local port forwarding

## Sources Consulted
- OpenTelemetry Collector zPages extension README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post described PipelineZ as exposing detailed live per-component counters such as received spans, refused spans, batch counts, exporter failures, and queue size. Current zPages documentation describes PipelineZ as showing pipeline type, mutation status, and receiver/processor/exporter wiring. Updated those sections to use PipelineZ for topology and OpenTelemetry Collector internal metrics for counters.
- The list of zPages omitted TraceZ and optional ExpvarZ. Added both and clarified ExpvarZ requires the zPages expvar option.
- ServiceZ, ExtensionZ, and FeatureZ examples included unsupported or misleading details such as config checksums, request counts, health-check totals, and component capability lists. Simplified those examples to match the documented page purposes.
- The filter processor examples were inverted. The filter processor drops telemetry that matches a condition, so the high-priority pipeline must drop non-critical spans and the standard pipeline must drop critical spans. Updated both predicates and added `error_mode: ignore`.
- Internal metrics examples used the older `service.telemetry.metrics.address` field. Current documentation says `address` is ignored as of Collector v0.123.0; updated examples to use `service.telemetry.metrics.readers` with a Prometheus pull exporter.
- Automation examples scraped zPages HTML for queue and refused counters. Updated them to read structured metrics from `http://localhost:8888/metrics`.
- The performance section gave specific unsupported overhead numbers. Replaced them with a narrower statement that zPages are intended for lightweight in-process diagnostics and should still be access-restricted.

## Review Notes
The post is now technically accurate as a zPages and Collector internal telemetry troubleshooting guide. The sample backend endpoints remain placeholders and require environment-specific TLS/authentication settings in real deployments. The official zPages README also warns that zPages is incompatible with `service::telemetry::traces::level` set to `none`; the post does not configure that field.
