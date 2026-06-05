# Validation Summary: How to Visualize OpenTelemetry Profiles as Flame Graphs and Icicle Charts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry profiles
- OTLP
- Grafana Pyroscope
- Grafana Pyroscope data source
- Grafana flame graph panel
- Docker

## Sources Consulted
- Grafana Pyroscope OpenTelemetry eBPF profiler documentation: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Grafana Pyroscope release notes: https://grafana.com/docs/pyroscope/latest/release-notes/
- Grafana Pyroscope 1.10 release notes: https://grafana.com/docs/pyroscope/latest/release-notes/v1-10/
- Grafana Pyroscope profile types documentation: https://grafana.com/docs/pyroscope/latest/configure-client/profile-types/
- Grafana Pyroscope server HTTP API reference: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Grafana Pyroscope data source documentation: https://grafana.com/docs/grafana/latest/datasources/pyroscope/
- Grafana Pyroscope query profile data documentation: https://grafana.com/docs/grafana/latest/datasources/pyroscope/query-profile-data/
- Grafana flame graph visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/flame-graph/
- Grafana Pyroscope flame graphs documentation: https://grafana.com/docs/pyroscope/latest/introduction/flamegraphs/

## Issues Found
- The Docker command pinned `grafana/pyroscope:1.7.0`, but Pyroscope 1.7 predates the release notes entry where experimental OpenTelemetry profiles support was added in Pyroscope 1.10. Updated the image to `grafana/pyroscope:2.0.2`, a current 2.0.x tag.
- The Collector exporter used `otlphttp/pyroscope` with an HTTP endpoint. Current Grafana Pyroscope OpenTelemetry documentation shows Pyroscope receiving profiles over OTLP gRPC on port 4040, so the exporter was changed to `otlp/pyroscope` with `endpoint: pyroscope:4040`.
- The Collector profiles pipeline referenced the old exporter name after the exporter block changed. Updated the pipeline exporter reference to `otlp/pyroscope`.
- The Collector configuration omitted the profiles feature gate. Added a note to start the Collector with `--feature-gates=service.profilesSupport`, matching current OpenTelemetry profiles guidance.
- The flame graph reading guidance said wide bars at the top indicate direct CPU self time. Grafana's flame graph documentation distinguishes cumulative value from self value, so the wording now says wide bars indicate cumulative resource usage and that self value or the top table should be used for direct work.
- The post claimed Pyroscope has a single-click toggle between flame graph and icicle chart views. Current Grafana/Pyroscope documentation describes flame graph and top table views, not an icicle toggle, and Pyroscope's flame graph documentation already presents the root at the top. Reworded the section to describe that icicle-style orientation accurately.

## Review Notes
OpenTelemetry profiles remain an actively evolving signal, and Grafana's documentation notes that compatibility between the profiler, Collector, and Pyroscope requires careful version management. The query examples and Grafana data source provisioning snippet are consistent with current Grafana/Pyroscope documentation.
