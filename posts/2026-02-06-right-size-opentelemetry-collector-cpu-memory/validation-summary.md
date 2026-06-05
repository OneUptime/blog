# Validation Summary: How to Right-Size OpenTelemetry Collector CPU and Memory Based

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- telemetrygen
- Prometheus and PromQL
- Kubernetes resource requests and limits
- OpenTelemetry Collector memory_limiter processor
- Python and NumPy
- Bash, curl, and jq

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector memory_limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- telemetrygen documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen
- telemetrygen common flag source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/internal/config/config.go
- telemetrygen traces flag source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/pkg/traces/config.go
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- Prometheus querying basics and aggregation operator syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/ and https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The internal telemetry configuration used `service.telemetry.metrics.address`, which current Collector documentation says is ignored as of Collector v0.123.0. Changed the snippet to the documented `service.telemetry.metrics.readers.pull.exporter.prometheus` configuration with `host` and `port`.
- The Prometheus metric queries use `_total` counter suffixes, so the updated Prometheus reader config explicitly sets `without_type_suffix: false` to keep those query names aligned.
- The telemetrygen benchmark used `--workers 4` with `--rate ${RATE}` while telemetrygen documents `--rate` as the approximate number of signals per second each worker generates. Removed the workers flag so each benchmark step is closer to the stated total spans/sec.
- The deployment example pinned `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated for a current guide. Updated it to `0.153.0`, the latest release found during review.
- The memory limiter example used fixed `limit_mib` and `spike_limit_mib` values for a containerized deployment. The current memory_limiter documentation recommends `limit_percentage` for containerized environments with memory restrictions. Changed the example to `limit_percentage: 80` and `spike_limit_percentage: 20`.

## Review Notes
The benchmark numbers remain illustrative and environment-dependent. The CPU and memory calculations are directionally valid for capacity planning, but teams should rerun the benchmark after changing processors, exporters, payload size, batching, or backend latency.
