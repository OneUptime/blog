# Validation Summary: How to Implement Continuous Profiling with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry Go SDK
- Go `runtime/pprof`
- OpenTelemetry metrics API for Go
- Grafana Pyroscope
- Grafana Tempo
- Docker Compose

## Sources Consulted
- OpenTelemetry Profiles documentation: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry Profiles specification: https://opentelemetry.io/docs/specs/otel/profiles/
- OpenTelemetry Profiles public alpha announcement: https://opentelemetry.io/blog/2026/profiles-alpha/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Go `runtime/pprof` package documentation: https://pkg.go.dev/runtime/pprof
- OpenTelemetry Go metrics API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- Grafana Pyroscope Go push mode documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/go_push/
- Grafana Pyroscope server HTTP API documentation: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Grafana Pyroscope OpenTelemetry eBPF profiler documentation: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Grafana Pyroscope span profiles for Go documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/go-span-profiles/
- Grafana `otel-profiling-go` documentation: https://github.com/grafana/otel-profiling-go

## Issues Found
- The setup commands installed `github.com/google/pprof`, but the post's examples use Go's standard `runtime/pprof` package and discuss trace/profile correlation. Replaced it with `github.com/grafana/otel-profiling-go`, which is the relevant Grafana package for OpenTelemetry trace/profile correlation.
- The profile exporter section described custom OTLP handling but implemented a raw HTTP exporter. Updated the text to distinguish OTLP Profiles from direct `pprof` ingestion, and changed the example to target Pyroscope's documented `/ingest` API with `name`, `from`, `until`, and `format=pprof` query parameters.
- The exporter claimed retry handling that was not implemented. Removed that claim.
- The exporter sent `application/x-protobuf` without the Pyroscope metadata required for `pprof` ingestion. Changed it to send compressed pprof data with the documented query parameters and a generic binary content type.
- The Collector configuration used `httpcheck` as if it were a receiver for uploaded profile data. Removed it and added a real OTLP `profiles` pipeline using an OTLP exporter to Pyroscope.
- The Collector configuration used a TLS-enabled Tempo exporter with certificate paths that did not match the included Docker Compose stack. Changed it to `insecure: true` for the local Compose example.
- The Collector resource processor used `from_attribute: VERSION`, which reads another telemetry attribute rather than an environment variable. Changed it to `value: "${env:VERSION}"`.
- The complete integration example claimed integrated metrics, but it only initializes tracing and custom profiling. Updated the description to avoid implying an OTLP metrics pipeline in the application code.
- The security snippet imported `strings` without using it. Removed the unused import.

## Review Notes
- The OpenTelemetry Profiles signal is public alpha as of the consulted 2026 documentation, and Collector/backend compatibility can be version-sensitive. The post now calls out that profiles support is still maturing and may require feature-gate checks depending on the Collector build.
- The custom Go profiler snippets are illustrative. In production, the official Pyroscope Go SDK or OpenTelemetry eBPF profiler is usually preferable to maintaining a custom exporter.
