# Validation Summary: How to Connect OpenTelemetry Profiles to Traces for Code-Level Latency Root

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Profiles
- OpenTelemetry Distributed Tracing
- OpenTelemetry Java agent
- OpenTelemetry Go SDK
- Go runtime/pprof labels
- OpenTelemetry Collector
- OTLP

## Sources Consulted
- OpenTelemetry Profiles concepts: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry Profiles specification: https://opentelemetry.io/docs/specs/otel/profiles/
- OpenTelemetry Profiles public alpha announcement: https://opentelemetry.io/blog/2026/profiles-alpha/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector profiling support notes: https://opentelemetry.io/blog/2024/state-profiling/
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Go OTLP trace gRPC exporter API: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go SDK trace API: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- Go runtime/pprof package documentation: https://pkg.go.dev/runtime/pprof

## Issues Found
- The post claimed OpenTelemetry's unified profiling signal "works today" without caveats. Updated the wording to state that profiles are experimental and require compatible profilers, collectors, and backends.
- The correlation model implied every profiler automatically checks for an active span and attaches trace context. Updated it to describe this as profiler/integration-dependent.
- The Java section used unsupported profiling flags for the OpenTelemetry Java agent, including `otel.profiling.enabled` and `otel.profiling.sampling.interval`. Removed those flags and clarified that the Java agent provides trace context while profiling must come from a compatible profiler.
- The Go section referred to an OpenTelemetry Go profiling bridge that is not part of the official Go SDK. Reframed the example around pprof labels and fixed unused imports in the Go snippet.
- The Collector section omitted the `service.profilesSupport` feature gate required for profile pipelines. Added the feature-gate note.
- The OTLP/HTTP profiles exporter endpoint used `/v1/profiles`, but the current OTLP profiles HTTP path is development-stage and backend-dependent. Changed the example to configure the exporter with the backend base endpoint.

## Review Notes
The post is technically valid after the fixes. OpenTelemetry Profiles remain experimental as of 2026-06-06, so production guidance should continue to be checked against the current Collector and backend documentation before deployment.
