# Validation Summary: How to Correlate Logs and Traces with Loki and Tempo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Grafana Loki
- Grafana Tempo
- Promtail
- Prometheus
- OpenTelemetry
- LogQL
- TraceQL
- Docker Compose
- Python / Flask
- Node.js / Express / Pino
- Go / slog

## Sources Consulted
- Grafana Loki structured metadata documentation: https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki LogQL metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace-to-logs correlation documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/
- Grafana Tempo TraceQL metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-queries/
- Grafana Tempo 2.0 and 2.4 release notes: https://grafana.com/docs/tempo/latest/release-notes/version-2/v2-0/ and https://grafana.com/docs/tempo/latest/release-notes/version-2/v2-4/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Go OTLP gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc

## Issues Found
- The prerequisites understated required versions for the examples. Updated Loki to 2.9.4+ for structured metadata and Tempo to 2.4+ for TraceQL metrics.
- Promtail was presented without its current lifecycle caveat. Added a note that Promtail is EOL as of March 2, 2026 and that new deployments should use Grafana Alloy or another supported client.
- The Docker Compose stack referenced Prometheus from Tempo and Grafana but did not deploy it. Added a Prometheus service, persistent volume, and minimal Prometheus configuration with the remote-write receiver enabled.
- The Tempo image was too old for the TraceQL metrics example. Updated it from 2.3.1 to 2.4.1.
- The Tempo metrics-generator configuration did not enable processors. Added non-deprecated default overrides for `service-graphs` and `span-metrics`.
- The Loki datasource was referenced by UID from Tempo but did not define `uid: loki`. Added the missing UID.
- The Grafana provisioning referenced a Prometheus datasource UID without defining that datasource. Added the Prometheus datasource.
- The Node.js OpenTelemetry example used the older provider/span processor setup and loaded instrumented modules too early. Updated it to use `NodeSDK` with auto-instrumentations before requiring Express.
- The LogQL aggregation example used invalid pipeline syntax. Replaced it with a valid `sum by (trace_id) (count_over_time(...[5m]))` metric query.
- The JavaScript trace ID example used a Python-style `#` comment. Changed it to `//`.
- The structured metadata version comment said Loki 2.7+. Corrected it to Loki 2.9+ with TSDB/v13 schema.

## Review Notes
Validated the Docker Compose snippet with `docker compose config`, and validated Loki, Tempo, Promtail, and Prometheus config snippets with their containerized config checkers. Python and JavaScript examples passed syntax checks. The Go toolchain was not installed locally, so the Go example was reviewed against OpenTelemetry Go package documentation but not compiled.
