# Validation Summary: How to Monitor CPU and Memory Allocation Hotspots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Profiles
- OpenTelemetry Collector
- OpenTelemetry eBPF profiler
- Grafana Pyroscope
- Go runtime memory profiling
- Pyroscope Go SDK
- Java allocation profiling
- async-profiler
- Docker

## Sources Consulted
- OpenTelemetry Profiles concepts: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry eBPF profiler repository: https://github.com/open-telemetry/opentelemetry-ebpf-profiler
- OpenTelemetry "The State of Profiling" Collector support note: https://opentelemetry.io/blog/2024/state-profiling/
- OpenTelemetry Profiles public alpha announcement: https://opentelemetry.io/blog/2026/profiles-alpha/
- Grafana Pyroscope OpenTelemetry eBPF profiler documentation: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Grafana Pyroscope Go SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/go_push/
- Go runtime MemProfileRate documentation: https://pkg.go.dev/runtime#MemProfileRate
- Grafana Pyroscope Java SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/java/
- Grafana Pyroscope server HTTP API documentation: https://grafana.com/docs/pyroscope/latest/reference-server-api/

## Issues Found
- The eBPF profiler Docker example used an outdated standalone image and environment variables. Updated it to the current specialized OpenTelemetry Collector distribution with a `profiling` receiver, `samples_per_second`, host mounts, and `--feature-gates=service.profilesSupport`.
- The post stated that the OpenTelemetry Go profiling integration exposes Go allocation profiles, but the example uses the Grafana Pyroscope Go SDK. Updated the wording to identify Pyroscope correctly.
- The Java section incorrectly said the OpenTelemetry eBPF profiler uses async-profiler under the hood for JVM processes and showed a non-official YAML shape. Replaced it with a Pyroscope Java agent example using documented allocation profiling environment variables.
- The Collector profile pipeline used `otlphttp/pyroscope` with an HTTP endpoint. Updated it to an OTLP gRPC exporter with `endpoint: pyroscope:4040` and insecure TLS configuration, matching current Pyroscope OTLP examples.
- The Pyroscope query example used an incomplete profile type string. Updated it to `process_cpu:cpu:nanoseconds:cpu:nanoseconds`.
- Softened production and line-level claims because OpenTelemetry Profiles is currently alpha and exact detail depends on runtime, symbolization, and profiler support.

## Review Notes
The post is technically relevant and now aligns with current OpenTelemetry Profiles and Grafana Pyroscope guidance. Future updates should revisit version-specific eBPF profiler details because OpenTelemetry Profiles and Collector profile support are still evolving and may have breaking changes.
