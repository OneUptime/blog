# Validation Summary: How to Create Tempo Metrics Generator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Tempo (metrics generator)
- Prometheus (remote write, PromQL)
- Grafana Mimir
- OpenTelemetry (OTLP receivers, span attributes)
- Grafana
- Docker Compose

## Sources Consulted
- Tempo metrics-generator overview: https://grafana.com/docs/tempo/latest/metrics-generator/
- Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Tempo span_metrics processor docs: https://grafana.com/docs/tempo/latest/metrics-generator/span_metrics/
- Tempo source — span metrics config: https://github.com/grafana/tempo/blob/main/modules/generator/processor/spanmetrics/config.go
- Tempo source — span metrics processor: https://github.com/grafana/tempo/blob/main/modules/generator/processor/spanmetrics/spanmetrics.go
- Tempo source — service graphs config: https://github.com/grafana/tempo/blob/main/modules/generator/processor/servicegraphs/config.go
- Tempo source — service graphs processor: https://github.com/grafana/tempo/blob/main/modules/generator/processor/servicegraphs/servicegraphs.go
- Tempo source — shared DimensionMappings struct: https://github.com/grafana/tempo/blob/main/pkg/sharedconfig/metrics_generator.go
- Tempo example tempo.yaml (single-binary): https://github.com/grafana/tempo/blob/main/example/docker-compose/single-binary/tempo.yaml
- Tempo example tempo.yaml (distributed): https://github.com/grafana/tempo/blob/main/example/docker-compose/distributed/tempo.yaml

## Issues Found
1. **`distributor.metrics_generator_ring` field does not exist.** The original config showed a `metrics_generator_ring` block under `distributor` with an `instance_addr`. This is not a real Tempo configuration field — the distributor forwards spans to the metrics generator automatically once the `metrics_generator` block is configured and the processors are enabled in `overrides`. Removed the invalid block and clarified the comment.
2. **Incorrect description of `enable_target_info`.** The comment claimed it "Enable all three RED metrics", but RED metrics (`traces_spanmetrics_calls_total`, `traces_spanmetrics_latency`, `traces_spanmetrics_size_total`) are produced regardless of this setting. `enable_target_info` toggles emission of the separate `traces_target_info` gauge metric. Updated the inline comment.
3. **`dimension_mappings` used a non-existent `regex` field.** Tempo's `DimensionMappings` struct (in `pkg/sharedconfig/metrics_generator.go`) only has `name`, `source_labels`, and `join` — no `regex` field exists, and the processor does not perform regex-based grouping of source values. Rewrote the example to use the real fields (`name`, `source_labels`, `join`) and updated the surrounding text to describe what the mapping actually does (renaming/combining attributes into a single label).
4. **`metadata_config` was mislabeled as "Retry configuration".** `metadata_config` controls metric metadata sending (`send`, `send_interval`), not retry behavior. Updated the comment.

## Review Notes
- Service-graph metric names (`traces_service_graph_request_total`, `traces_service_graph_request_failed_total`, `traces_service_graph_request_server_seconds`, `traces_service_graph_request_client_seconds`) were verified against `modules/generator/processor/servicegraphs/servicegraphs.go` and are correct.
- Span-metric names were verified against `modules/generator/processor/spanmetrics/spanmetrics.go`. The underlying histogram is `traces_spanmetrics_latency`; `_bucket`, `_count`, and `_sum` are the Prometheus client variants. Listing them as three distinct metric rows in the table is unusual but not incorrect.
- The `status_code` label value `STATUS_CODE_ERROR` used in the example PromQL is correct: span metrics emit the protobuf enum string (`STATUS_CODE_UNSET`/`STATUS_CODE_OK`/`STATUS_CODE_ERROR`) via `span.GetStatus().GetCode().String()`.
- The intrinsic dimension fields (`service`, `span_name`, `span_kind`, `status_code`) match the Tempo config struct exactly.
- The `overrides.defaults.metrics_generator.processors` list with values `service-graphs` and `span-metrics` matches Tempo's expected processor names.
- Image versions used in the Docker Compose example (`grafana/tempo:2.3.0`, `prom/prometheus:v2.48.0`, `grafana/grafana:10.2.0`) are from late 2023. They still work, but readers picking the post up later may want to bump to current releases (Tempo 2.6+, Prometheus 2.55+, Grafana 11+). Left unchanged as the post text doesn't make any version-specific claims that the older images contradict.
- The `service_graphs` processor in current Tempo defaults `histogram_buckets` to an exponential range starting at 0.1s — the post does not override it, which is fine.
