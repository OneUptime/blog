# Validation Summary: How to Operationalize Calico Component Metrics Monitoring

## Status
validated

## Post Type
Operational guide / Runbook

## Technologies Covered
- Calico (Felix component)
- Kubernetes
- Prometheus
- kube-prometheus-stack (Helm chart)
- Prometheus Operator (ServiceMonitor, `prometheus-operated` service)
- Thanos (remote write receive endpoint)
- VictoriaMetrics (mentioned as alternative)
- PromQL (alert expressions and query examples)
- kubectl / curl / jq (runbook commands)

## Sources Consulted
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Cloud Felix Prometheus reference: https://docs.tigera.io/calico-cloud/reference/component-resources/node/felix/prometheus
- Prometheus storage / retention documentation (Prometheus project docs)
- kube-prometheus-stack Helm chart values reference (prometheus-community/helm-charts)
- Thanos receive component documentation (default remote-write port 19291)

## Issues Found
No technical issues found.

Verification details:
- `felix_int_dataplane_apply_time_seconds` (histogram) — confirmed real; the `_bucket` suffix is appropriate for `histogram_quantile`.
- `felix_active_local_policies` (gauge) — confirmed real per-node metric; correct choice for per-node policy count.
- `prometheus-operated` service name — correct service created by Prometheus Operator on port 9090.
- Thanos receive remote-write URL/port `19291/api/v1/receive` — matches Thanos receive defaults.
- `retention` / `retentionSize` field names in `prometheusSpec` — correct keys in kube-prometheus-stack values.
- `writeRelabelConfigs` with `sourceLabels`/`regex`/`action: keep` — valid Prometheus relabel syntax.
- PromQL in the SLO alert (`sum_over_time(up{...}[7d]) / count_over_time(up{...}[7d])`) is a valid scrape-success-ratio expression.

## Review Notes
- The Thanos remote-write example uses `https://`; in many in-cluster deployments Thanos receive is exposed over HTTP — readers should adapt the scheme/TLS config to their actual receiver.
- `retentionSize: 50GB` is accepted by Prometheus (it also supports KB/MB/TB/PB and `*B` variants). The inline comment "whichever is smaller" reflects Prometheus's behavior of honoring whichever limit (time or size) is hit first.
- `felix_active_local_policies` is per-node; for cluster-wide totals, `felix_cluster_num_policies` would be the appropriate metric — worth noting if the runbook is ever extended.
- The post does not pin Calico, Prometheus Operator, or Thanos versions; the configuration shown is stable across recent releases (Calico v3.26+, kube-prometheus-stack 50.x+), but readers should still cross-check field names against the version they deploy.
