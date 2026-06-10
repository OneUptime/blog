# Validation Summary: How to Create Tempo Service Graph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Tempo (metrics-generator, service graphs, span metrics processors)
- Prometheus (remote write receiver)
- Grafana Mimir / Cortex
- Grafana (Node Graph panel, Tempo data source, Explore view)
- PromQL
- Kubernetes / Helm (grafana/tempo and grafana-community/tempo charts)
- OpenTelemetry semantic conventions (peer.service, server.address, db.name, etc.)

## Sources Consulted
- Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Tempo service graphs docs: https://grafana.com/docs/tempo/latest/metrics-generator/service_graphs/
- Tempo service graph cardinality docs: https://grafana.com/docs/tempo/latest/metrics-generator/service_graphs/estimate-cardinality/
- grafana-community/helm-charts tempo values.yaml (single-binary chart)
- grafana/helm-charts tempo-distributed values.yaml
- Prometheus command line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/

## Issues Found

1. **`enabled: true` inside `processor.service_graphs` and `processor.span_metrics` (multiple code blocks).** Tempo's metrics-generator processors do not have an `enabled` field at the processor level. The official configuration reference shows that processors are turned on per tenant by listing their names under `overrides.defaults.metrics_generator.processors` (or `overrides.per_tenant_overrides`). Removed the fake `enabled: true` keys from the Basic Configuration, Full Production Configuration, and Helm Values examples. Added an `overrides.defaults.metrics_generator.processors: [service-graphs]` block to the Basic Configuration so the example actually generates metrics (the Full Production example already had this section).

2. **`wal_flush_frequency: 1m` under `metrics_generator.storage` (Full Production Configuration).** This key is not documented under `metrics_generator.storage`. The documented top-level keys there are `path`, `wal`, `remote_write`, `remote_write_flush_deadline`, and `remote_write_add_org_id_header`. Removed the line to avoid suggesting an invalid field.

3. **Helm values nested under `tempo:` key.** The standalone `grafana-community/tempo` (and former `grafana/tempo`) chart exposes `metricsGenerator` at the top level of values.yaml, not under a `tempo:` parent. Flattened the example accordingly. Also added an `overrides.defaults.metrics_generator.processors` block — the chart's top-level `metricsGenerator.enabled` turns on the component but does not by itself activate processors.

4. **Summary table row "Enable service graphs | Set `processor.service_graphs.enabled: true`".** Updated to reflect the correct mechanism: add `service-graphs` to `overrides.defaults.metrics_generator.processors`.

## Review Notes

- Metric names referenced in the post (`traces_service_graph_request_total`, `traces_service_graph_request_failed_total`, `traces_service_graph_request_server_seconds`, `traces_service_graph_request_client_seconds`, `traces_service_graph_unpaired_spans_total`, `traces_service_graph_dropped_spans_total`) match Tempo's documented metric names.
- Processor configuration fields used (`wait`, `max_items`, `workers`, `histogram_buckets`, `dimensions`, `peer_attributes`, `enable_virtual_node_label`) all match Tempo's documented service_graphs schema.
- The `--web.enable-remote-write-receiver` Prometheus flag is correct.
- PromQL queries are syntactically valid, including the `histogram_quantile` over `le`-grouped buckets. Note that custom dimensions containing dots (e.g. `db.system`, `k8s.namespace.name`) are converted to underscores in Prometheus label names; the post correctly uses `db_system` and `k8s_namespace_name` in the PromQL examples.
- Grafana data source linking instructions are described conceptually rather than via exact menu paths, which is reasonable given that the UI changes between Grafana versions.
- The Helm chart landscape is evolving: `grafana/helm-charts` notes the single-binary `tempo` chart has been migrated to `grafana-community/helm-charts` (effective after 2026-01-30). The `tempo-distributed` chart remains in the original repo. The post does not specify which chart, but the simplified values shown work as the public interface for both with minor key differences.
