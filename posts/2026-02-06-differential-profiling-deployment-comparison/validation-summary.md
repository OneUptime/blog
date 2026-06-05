# Validation Summary: How to Use Differential Profiling with OpenTelemetry to Compare Before

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry profiling
- OpenTelemetry eBPF profiler
- Grafana Pyroscope
- Differential profiling
- Flame graphs and diff flame graphs
- Python
- curl

## Sources Consulted
- Grafana Pyroscope server API: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Grafana Pyroscope ride share tutorial and Diff flame graph workflow: https://grafana.com/docs/pyroscope/latest/get-started/ride-share-tutorial/
- Grafana Pyroscope flame graphs documentation: https://grafana.com/docs/pyroscope/latest/introduction/flamegraphs/
- Grafana Pyroscope OpenTelemetry eBPF profiler documentation: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Grafana Pyroscope profile types and instrumentation documentation: https://grafana.com/docs/pyroscope/latest/configure-client/profile-types/
- Grafana Pyroscope querier protobuf definition: https://raw.githubusercontent.com/grafana/pyroscope/main/api/querier/v1/querier.proto
- Grafana Pyroscope flamebearer package documentation: https://pkg.go.dev/github.com/grafana/pyroscope/v2/pkg/og/structs/flamebearer

## Issues Found
- The post used the older `GET /api/v1/diff` query-string style for Pyroscope diff profiles. Updated the curl and Python examples to use the documented Connect endpoint, `POST /querier.v1.QuerierService/Diff`.
- The API examples used second-based or ISO timestamp inputs for fields that the current Pyroscope Diff API documents as milliseconds since epoch. Updated the curl and Python snippets to send millisecond timestamps.
- The CPU profile type was shown as `process_cpu:cpu:nanoseconds`, but the current Pyroscope API examples use the full profile type ID form, such as `process_cpu:cpu:nanoseconds:cpu:nanoseconds`. Updated the CPU examples.
- The allocation profile query used the shorter `memory:alloc_space:bytes` profile type. Updated it to the current full profile type ID, `memory:alloc_space:bytes:space:bytes`.
- The Python regression parser expected a legacy `flamebearer` response and an incorrect six-value level layout. Updated it to read the documented `flamegraph` response and parse diff levels as seven-value chunks with left and right self values.

## Review Notes
The OpenTelemetry profiles signal and the OpenTelemetry eBPF profiler are still under active development, so compatibility between the profiler, Collector, and Pyroscope should be version-managed carefully in production deployments.
