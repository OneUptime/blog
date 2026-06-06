# Validation Summary: How to Monitor Vault with Prometheus

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- HashiCorp Vault (telemetry, policies, tokens, Raft storage, audit log)
- Prometheus (scrape config, `authorization`, summaries, alerting rules, remote_write)
- Alertmanager (alerting groups, severities)
- Grafana (dashboard JSON model)
- Prometheus Operator (`ServiceMonitor` CRD)
- Kubernetes (`kubectl` secrets)
- PromQL (rates, quantiles, `up`, `absent`, `unless`)

## Sources Consulted
- [Vault Telemetry: Core system metrics](https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/core-system)
- [Vault Telemetry: All metrics](https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all)
- [Vault Telemetry: Authentication metrics](https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/authn)
- [Vault Telemetry: Availability metrics](https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/availability)
- [Vault Telemetry: Secrets metrics](https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/secrets)
- [Vault Telemetry: Raft metrics](https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/raft)
- [Vault Telemetry: Key health-check metrics](https://developer.hashicorp.com/vault/docs/internals/telemetry/key-metrics)
- [Vault Telemetry configuration stanza](https://developer.hashicorp.com/vault/docs/configuration/telemetry)
- [Vault `/sys/metrics` HTTP API](https://developer.hashicorp.com/vault/api-docs/system/metrics)
- [Vault tutorial: Monitor telemetry with Prometheus & Grafana](https://developer.hashicorp.com/vault/tutorials/archive/monitor-telemetry-grafana-prometheus)
- [Prometheus Operator ServiceMonitor CRD reference](https://docs.openshift.com/container-platform/latest/rest_api/monitoring_apis/servicemonitor-monitoring-coreos-com-v1.html)
- [Prometheus practices: Histograms and summaries](https://prometheus.io/docs/practices/histograms/)

## Issues Found

1. **`vault_core_handle_request_duration_seconds_bucket` is not a real Vault metric.**
   - Vault exposes `vault.core.handle_request` as a Prometheus **summary** with `{quantile="..."}` labels and `_count` / `_sum` suffixes (the underlying go-metrics Prometheus sink emits summaries, not histograms). There is no `_bucket` series, and the canonical metric name contains no `_duration_seconds` suffix. Vault also reports this in **milliseconds**, not seconds.
   - Replaced the `histogram_quantile(0.99, rate(vault_core_handle_request_duration_seconds_bucket[5m]))` query in the "Request Latency" PromQL block, the Grafana panel, and the `VaultHighLatency` alert rule with `vault_core_handle_request{quantile="0.99"}`. The alert threshold was changed from `> 1` (second) to `> 1000` (ms) to match the actual unit, and a clarifying comment was added.

2. **`vault_secret_kv_get_latency_ms` is not a real Vault metric.**
   - The KV secrets engine only exposes `vault.secret.kv.count` (gauge). There is no per-operation `*_latency_ms` metric for KV reads.
   - Replaced the line with a more useful PromQL that computes the average request latency from the summary (`rate(_sum) / rate(_count)`), keeping the section coherent with the actual metric model.

3. **`vault_ha_active` is not a real Vault metric.**
   - The HA "active node" status is reported via `vault.core.active` (already covered in the post). The `vault.ha.*` namespace is reserved for standby→leader RPC metrics (`vault.ha.rpc.client.echo`, `vault.ha.rpc.client.forward`, etc.), not an HA-status gauge.
   - Removed `vault_ha_active` from the Leadership PromQL block, and replaced the `HA[vault_ha_active]` node in the "Key Metrics to Monitor" Mermaid diagram with `PEERS[vault_raft_peers]` (a real metric that genuinely reports cluster-wide HA topology). Also replaced the placeholder `vault_*_latency` in the same diagram with the concrete `vault_core_handle_request` metric used elsewhere in the post.

4. **`vault_raft_commitTime_bucket` is not a real Vault metric.**
   - `vault.raft.commitTime` is also a Prometheus summary in milliseconds, so `histogram_quantile(...)` over a `_bucket` series will return nothing.
   - Replaced the Raft latency PromQL with `vault_raft_commitTime{quantile="0.99"}` and a clarifying comment.

5. **`ServiceMonitor.bearerTokenSecret` is deprecated in `monitoring.coreos.com/v1`.**
   - Prometheus Operator now recommends `authorization.credentials` (referencing a Secret) for new deployments; `bearerTokenSecret` still works but is on the deprecation path.
   - Updated the ServiceMonitor manifest to use the modern `authorization: { type: Bearer, credentials: { name, key } }` form and noted the deprecation in a comment.

## Review Notes

- `prometheus_retention_time = "30s"` is technically valid (any non-zero value enables the Prometheus sink), but it is unusually short. The Vault default is `24h`, and HashiCorp's own support article recommends a value comfortably larger than the Prometheus `scrape_interval` to avoid losing samples if scrapes are delayed. Left as-is since it is not strictly incorrect, but worth tightening up the surrounding commentary in a future revision.
- The `up{job="vault"} == 1 unless on(instance, job) vault_core_unsealed` expression in the `VaultSealed` alert is a clever and correct pattern for catching the "metric disappeared" case described in the explanatory paragraph. Verified the PromQL semantics.
- The `vault_audit_log_request_failure` metric is a Prometheus **counter** in Vault's exposition. Using `rate(vault_audit_log_request_failure[5m])` is correct (the go-metrics Prometheus sink emits counters without a `_total` suffix, so the bare name is right).
- `vault_token_count` is updated by Vault only every ~10 minutes (organized by cluster/namespace), so alerts on it should account for this update cadence — currently the `for: 10m` window in `VaultTokenAccumulation` is reasonable.
- The high-cardinality relabel example uses regex `vault_route_.*`, which is correct in spirit — Vault's `vault.route.<op>.<mount>` metric family is the textbook high-cardinality offender on busy clusters.
- The OneUptime `remote_write` block uses the standard Prometheus `authorization: { type: Bearer, credentials: ... }` syntax, which is correct PromConfig.
