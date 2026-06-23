# Validation Summary: How to Implement Continuous Profiling in Go with pprof and Pyroscope

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Go
- `runtime/pprof`
- `net/http/pprof`
- Grafana Pyroscope
- `github.com/grafana/pyroscope-go`
- `github.com/grafana/otel-profiling-go`
- Docker
- Helm / Kubernetes
- Grafana Pyroscope data source
- Prometheus alerting rules
- OpenTelemetry Go

## Sources Consulted
- Go `net/http/pprof` documentation: https://pkg.go.dev/net/http/pprof
- Go `runtime/pprof` documentation: https://pkg.go.dev/runtime/pprof
- Go `runtime` documentation: https://pkg.go.dev/runtime
- Grafana Pyroscope Go push-mode SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/go_push/
- Grafana Pyroscope Docker/get started documentation: https://grafana.com/docs/pyroscope/latest/get-started/
- Grafana Pyroscope Helm deployment documentation: https://grafana.com/docs/pyroscope/latest/deploy-kubernetes/helm/
- Grafana Pyroscope upgrade guide: https://grafana.com/docs/pyroscope/latest/upgrade-guide/
- Grafana Pyroscope data source documentation: https://grafana.com/docs/grafana/latest/datasources/pyroscope/
- Grafana Pyroscope query profile data documentation: https://grafana.com/docs/grafana/latest/datasources/pyroscope/query-profile-data/
- Grafana Pyroscope Go span profiles documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/go-span-profiles/
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/

## Issues Found
- Updated the local Docker command from the legacy `pyroscope/pyroscope` image with `server` subcommand to the current `grafana/pyroscope:latest` image.
- Updated Helm installation instructions from the deprecated `pyroscope-io` chart repository to Grafana's current Helm repository and `grafana/pyroscope` chart.
- Removed unused `runtime` and `time` imports from the first Pyroscope Go example so the snippet is syntactically correct.
- Added the missing `time` import to the low-overhead Pyroscope configuration example because it uses `time.Second`.
- Changed the low-overhead example so it does not enable block and mutex profiling while saying to start with CPU and memory only.
- Removed an unused `runtime/pprof` import from the CPU sample-rate snippet.
- Removed an unused `net/http` import from the memory monitor snippet.
- Fixed `GoroutineTracker.Report`, which previously called `IsLeaking` while already holding the same mutex and would deadlock.
- Corrected the OpenTelemetry/Pyroscope correlation example to use Grafana's `otel-profiling-go` bridge instead of manually adding `trace_id` and `span_id` labels.
- Corrected the Grafana Pyroscope datasource provisioning type from `pyroscope` to `grafana-pyroscope-datasource`.
- Updated the Grafana dashboard Pyroscope query example to use `labelSelector` with `profileTypeId`, matching Grafana's Pyroscope query model.
- Replaced nonexistent Prometheus metric names such as `pyroscope_cpu_usage_percent` and `pyroscope_inuse_space_bytes` with standard Go runtime/process metrics for alert examples.
- Updated the OpenTelemetry Go documentation URL to the current `opentelemetry.io/docs/languages/go/` location.

## Review Notes
The `go` toolchain is not installed in this environment, so code snippets were reviewed statically and against official documentation rather than compiled locally. The post is now technically aligned with current Go, Grafana Pyroscope, Grafana datasource, Helm, and OpenTelemetry documentation.
