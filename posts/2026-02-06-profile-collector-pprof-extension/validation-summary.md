# Validation Summary: How to Profile the Collector with pprof Extension

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector pprof extension
- Go `net/http/pprof` and `runtime` profiling
- `go tool pprof`
- Kubernetes `kubectl port-forward`
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector pprof extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/pprofextension
- Go `net/http/pprof` package documentation: https://pkg.go.dev/net/http/pprof
- Go `runtime.SetBlockProfileRate` and `runtime.SetMutexProfileFraction` documentation: https://pkg.go.dev/runtime
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter

## Issues Found
- The post showed `curl -X POST .../debug/pprof/block?rate=1` and `curl -X POST .../debug/pprof/mutex?rate=1` as runtime ways to enable block and mutex profiling. Go's `net/http/pprof` endpoints expose profiles but do not provide HTTP setters for profiling rates, and current Go documentation says pprof paths are requested with GET. Replaced those examples with pprof extension configuration changes and restart/reload guidance.
- Several commands attempted to read profile counts with `curl .../debug/pprof/goroutine | head -1` or `curl .../debug/pprof/heap | head -1`. The default pprof response is binary profile data. Updated these examples to use `?debug=1` where the post expects text output.
- The production configuration used `service.telemetry.metrics.address`. Current OpenTelemetry Collector documentation notes this setting is ignored as of Collector v0.123.0. Removed the stale `address` line from the example.

## Review Notes
Most examples are illustrative rather than exact Collector source output. The pprof extension fields, pprof profile paths, `go tool pprof` usage, OTLP exporter compression setting, and Kubernetes port-forward command are otherwise consistent with official documentation.
