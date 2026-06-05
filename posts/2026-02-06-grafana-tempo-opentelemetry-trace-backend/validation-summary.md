# Validation Summary: How to Configure Grafana Tempo as an OpenTelemetry Trace Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Tempo
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Grafana Tempo data source provisioning
- TraceQL
- Docker Compose
- S3 object storage

## Sources Consulted
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo metrics-generator documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo ingestion limits documentation: https://grafana.com/docs/tempo/latest/operations/manage-trace-ingestion/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Service Graph documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The introductory comparison implied Jaeger and Zipkin inherently need Elasticsearch or Cassandra. Updated it to say older tracing deployments often rely on those backends, which avoids overstating their storage requirements.
- The Tempo configuration used older `ingester` and `compactor` blocks while the Docker example used `grafana/tempo:latest`. Updated the example to use current `live_store` and `backend_worker.compaction` settings documented by Tempo.
- The Grafana data source provisioning snippet included empty `tracesToLogsV2.datasourceUid` and `serviceMap.datasourceUid` values, and an undocumented `search.filters` block. Simplified the snippet to documented `nodeGraph.enabled` and `search.hide` settings.
- The explanation claimed `nodeGraph` enables service graph visualization by itself. Updated the text to explain that Service Graph also requires generated service graph metrics in a Prometheus-compatible backend and a linked `serviceMap.datasourceUid`.
- The S3 example used `${...}` variables without mentioning Tempo's required `-config.expand-env=true` flag. Added that note.
- The production tuning section referred to the old ingester/compactor model and placed `max_bytes_per_trace` and `max_traces_per_user` in incorrect override blocks. Updated the wording and snippet to use current ingestion rate settings, `ingestion.max_traces_per_user`, and `global.max_bytes_per_trace`.

## Review Notes
The OpenTelemetry Collector tail sampling and OTLP exporter examples are consistent with the current OpenTelemetry Collector contrib documentation. The TraceQL examples match Grafana Tempo's documented syntax. The YAML snippets were parsed successfully for syntax, but the full Docker Compose stack was not executed in this review.
