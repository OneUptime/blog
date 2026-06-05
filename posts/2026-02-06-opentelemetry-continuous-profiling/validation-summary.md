# Validation Summary: How to Implement OpenTelemetry Profiling (Continuous Profiling Signal)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Profiles
- OpenTelemetry Collector
- OTLP
- pprof
- Go
- Python
- eBPF profiling
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Profiles concepts: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry specification status summary: https://opentelemetry.io/docs/specs/status/
- OpenTelemetry Profiles specification: https://opentelemetry.io/docs/specs/otel/profiles/
- OpenTelemetry pprof compatibility specification: https://opentelemetry.io/docs/specs/otel/profiles/pprof/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector contrib pprof receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/pprofreceiver/README.md
- OpenTelemetry eBPF profiler README: https://github.com/open-telemetry/opentelemetry-ebpf-profiler
- OpenTelemetry Python documentation: https://opentelemetry.io/docs/languages/python/
- Go pprof package documentation: https://pkg.go.dev/net/http/pprof
- Go module proxy checks for `go.opentelemetry.io/contrib/profiling` and `go.opentelemetry.io/otel/exporters/otlp/otlpprofile/otlpprofilegrpc`
- PyPI package check for `opentelemetry-profiling`

## Issues Found
- The post referenced non-existent Go modules and APIs: `go.opentelemetry.io/contrib/profiling`, `go.opentelemetry.io/otel/exporters/otlp/otlpprofile/otlpprofilegrpc`, `profiling.NewProvider`, `WithCPUProfiling`, `WithMemoryProfiling`, `WithSampleRate`, `WithExportInterval`, `WithMaxStackDepth`, `WithMaxSamplesPerExport`, and `profiling.WithSpanContext`. I replaced these with the current supported approaches: Go's standard pprof endpoints, the Collector contrib `pprof` receiver, and OTLP profiles export.
- The post described automatic Go span/profile linking through a profiling SDK. I changed this to explain that OpenTelemetry Profiles can carry trace and span IDs, but pprof receiver collection is process/time/resource correlated unless the profiler records span identifiers.
- The Collector profiles example omitted the Alpha feature gate and used an OTLP gRPC exporter with an HTTPS URL path. I added the `service.profilesSupport` feature-gate note and changed the HTTPS example to use the OTLP HTTP exporter.
- The Python section referenced a non-existent official `opentelemetry.profiling` package and `ContinuousProfiler` / `OTLPProfileExporter` APIs. I replaced it with the current OpenTelemetry-native Linux eBPF profiler path and noted that the official Python API/SDK covers traces, metrics, and logs, not an official profiling SDK.
- The production-overhead section used the removed fictional Go profiling SDK options and made fixed overhead claims for Go and Python. I replaced it with Collector `pprof` receiver tuning and qualified overhead guidance based on the OpenTelemetry eBPF profiler documentation.
- The data-model section described a generic "Link" object connecting profiles to spans. I corrected this to trace correlation via sample trace/span attributes when supported.

## Review Notes
OpenTelemetry Profiles are Alpha / development-stage, and language-specific profiling SDK support is still evolving. Future updates should re-check package names, Collector feature gates, and backend support before publishing or republishing this guide.
