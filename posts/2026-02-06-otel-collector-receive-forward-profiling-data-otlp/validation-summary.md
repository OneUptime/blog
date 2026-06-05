# Validation Summary: How to Configure the OpenTelemetry Collector to Receive

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry profiles signal
- OTLP receiver and exporters
- Collector processors: memory_limiter, resource, filter, batch
- zPages and Collector internal telemetry
- Grafana Pyroscope and OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry profiling status and Collector profile feature gate: https://opentelemetry.io/blog/2024/state-profiling/
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector troubleshooting and zPages docs: https://opentelemetry.io/docs/collector/troubleshooting/
- Grafana Pyroscope OpenTelemetry eBPF profiler docs: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime Kubernetes Agent profiling docs: https://oneuptime.com/docs/en/monitor/kubernetes-agent
- Local validation with `otel/opentelemetry-collector-contrib:latest` (`otelcol-contrib` 0.153.0), using `validate --feature-gates=service.profilesSupport`.

## Issues Found
- Profile pipelines require the `service.profilesSupport` feature gate. Added the requirement to the intro and a startup command before the first Collector config.
- The examples used the `batch` processor in a profiles pipeline, but `otelcol-contrib` 0.153.0 rejects batch for profiles. Removed profile batching and updated profile pipelines to use profile-aware processors only.
- The profile filtering example used deprecated/older include/exclude style configuration. Replaced it with current OTTL-based `profile_conditions`.
- The gateway examples referenced processors that were not defined or unsupported for profiles. Added `memory_limiter` definitions and removed unsupported `batch/profiles` usage.
- The Pyroscope example used port 4317 with TLS enabled, while current Pyroscope OTLP profile examples use port 4040 with insecure gRPC in local/internal examples. Updated the endpoint example accordingly.
- The OneUptime endpoint was shown as `https://otlp.oneuptime.com`; current OneUptime docs use `https://oneuptime.com/otlp` with `x-oneuptime-token`. Updated the endpoint, JSON encoding, and content type header.
- The zPages section implied `/debug/tracez` verifies profile data flow. Clarified that TraceZ is for trace operations.
- The Collector metrics examples listed exact profile metric names that are not guaranteed by current Collector docs. Replaced them with a version-aware grep and guidance to look for profile-related receiver/exporter counts.

## Review Notes
OpenTelemetry profiles remain alpha and profile support is still gated in the Collector. The corrected snippets were validated against `otelcol-contrib` 0.153.0 with `service.profilesSupport` enabled; future Collector releases may change profile component support or metric names.
