# Validation Summary: How to Monitor or Log Dropped Network Traffic with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium (CNI / eBPF networking)
- Hubble (observability layer for Cilium)
- Hubble CLI (`hubble observe`)
- Hubble Exporter (file-based flow logging)
- Prometheus metrics & PromQL
- Prometheus Alertmanager rules
- Grafana dashboards
- Mermaid diagrams
- Log aggregation (Loki / Elasticsearch — referenced as targets)

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium 1.16 Monitoring & Metrics docs (for label verification): https://docs.cilium.io/en/v1.16/observability/metrics/
- Cilium source code — drop reason strings: https://raw.githubusercontent.com/cilium/cilium/main/pkg/monitor/api/drop.go
- Cilium source code — metric labels: https://raw.githubusercontent.com/cilium/cilium/main/pkg/metrics/metrics.go
- Cilium Hubble Exporter configuration docs (ConfigMap keys: `hubble-export-file-path`, `hubble-export-file-max-size-mb`, `hubble-export-file-max-backups`, `hubble-export-allowlist`)
- Prometheus PromQL operators and aggregation docs: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Hubble FlowFilter proto (verdict enum format for allowlist JSON)

## Issues Found

1. **Invalid PromQL syntax for "Drops by reason" query.**
   - Original: `rate(cilium_drop_count_total[5m]) by (reason)`
   - Problem: `by (...)` is an aggregation modifier — it is only valid attached to an aggregation operator (`sum`, `avg`, `count`, …). Using it directly after `rate(...)` is a parse error in PromQL.
   - Fix: changed to `sum by (reason) (rate(cilium_drop_count_total[5m]))`.

2. **Incorrect label value `POLICY_DENIED` for the `reason` label (two occurrences).**
   - Original: `reason="POLICY_DENIED"` (in the PromQL example block and in the `CiliumPolicyDrops` alert rule).
   - Problem: Cilium's `cilium_drop_count_total` metric uses human-readable drop reason strings sourced from `pkg/monitor/api/drop.go` (e.g., "Invalid source MAC", "Policy denied"). The label for policy drops is `Policy denied` (capital P, space, lowercase d), not the underscore-uppercase constant name. Queries with `reason="POLICY_DENIED"` will silently match zero series.
   - Fix: changed both occurrences to `reason="Policy denied"`.

3. **Per-namespace drop query referenced a non-existent label.**
   - Original Grafana panel query: `sum by (destination_namespace) (rate(cilium_drop_count_total[5m]))`.
   - Problem: `cilium_drop_count_total` only exposes `reason` and `direction` labels — there is no `destination_namespace` (or any namespace) label on this metric. The query as written would collapse all drops into a single series with an empty `destination_namespace` value. Per-namespace drop attribution requires the Hubble metrics endpoint, which exposes `hubble_drop_total` with `source`/`destination` labels that map to namespace/pod when configured with the appropriate context.
   - Fix: changed the query to `sum by (destination) (rate(hubble_drop_total[5m]))` and added a parenthetical note that it requires Hubble metrics enabled with `destinationContext=namespace`.

## Review Notes

- Verified `hubble observe --verdict DROPPED --follow` and the JSON output flags — these are correct against current Hubble CLI behavior. Verdict values in the CLI accept `DROPPED`, `FORWARDED`, `ERROR`, `AUDIT`, `REDIRECTED`, `TRACED`, `TRANSLATED`.
- Verified the Hubble Exporter ConfigMap keys (`hubble-export-file-path`, `hubble-export-file-max-size-mb`, `hubble-export-file-max-backups`, `hubble-export-allowlist`) match the keys rendered by the Cilium Helm chart from `hubble.export.*` values.
- Verified the Hubble Exporter allowlist JSON format — it accepts JSON-encoded `FlowFilter` objects, and the `verdict` field uses the enum-name strings (`DROPPED`, `ERROR`, etc.), so `{"verdict":["DROPPED"]}` is valid.
- The JSONPath in the `jq` example uses fields (`time`, `flow.source.pod_name`, `flow.destination.pod_name`, `flow.drop_reason_desc`) that match the Hubble Flow proto's JSON serialization.
- The `cilium_drop_count_total` metric is enabled by default in Cilium; no extra `--metrics` configuration is required for the basic drop queries to work.
- For the `hubble_drop_total` query introduced in the fix, the user must additionally enable Hubble metrics (e.g., `hubble.metrics.enabled: '{drop:destinationContext=namespace}'` in Helm values). The post does not currently spell this out beyond the parenthetical note added during the fix; expanding it would be a future improvement, but is out of scope for "fix only what is technically wrong".
- The alert thresholds (`> 100 drops/sec` for total, `> 10 drops/sec` for policy drops) are illustrative — these should be tuned per environment, which the post implicitly acknowledges in the conclusion.
