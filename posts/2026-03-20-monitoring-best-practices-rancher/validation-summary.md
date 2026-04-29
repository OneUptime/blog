# Validation Summary: How to Implement Monitoring Best Practices in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (Rancher Monitoring app)
- Kubernetes
- Prometheus / kube-prometheus-stack
- Prometheus Operator (PrometheusRule CRDs)
- Grafana (HTTP API, dashboard imports)
- Alertmanager (routing, matchers, receivers)
- Helm (rancher-charts repo)
- Thanos / Grafana Mimir (remote_write for multi-cluster)
- node_exporter and kube-state-metrics metrics
- PagerDuty / Slack integrations

## Sources Consulted
- Rancher Monitoring docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guide
- Rancher charts index: https://charts.rancher.io/index.yaml
- Prometheus Operator API reference (PrometheusRule, Prometheus spec): https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus storage retention docs: https://prometheus.io/docs/prometheus/latest/storage/
- Alertmanager configuration docs (matchers syntax, route, receivers): https://prometheus.io/docs/alerting/latest/configuration/
- Grafana HTTP API — Dashboards: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Grafana.com dashboards (verified IDs): https://grafana.com/grafana/dashboards/1860, /315
- node_exporter metric names: https://github.com/prometheus/node_exporter
- kube-state-metrics metric reference: https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- etcd metrics reference: https://etcd.io/docs/latest/metrics/

## Issues Found

1. **Missing CRD chart prerequisite (Step 1).** The post showed `helm install rancher-monitoring` directly, but `rancher-monitoring` from `charts.rancher.io` depends on `rancher-monitoring-crd` being installed first (the CRD chart is not bundled — Rancher's UI auto-installs it via the `catalog.cattle.io/auto-install` annotation, but plain Helm CLI does not). Added an explicit `helm install rancher-monitoring-crd ...` step before the main install, and moved `--create-namespace` to the CRD install (since the namespace exists by the second command).

2. **Wrong Grafana dashboard IDs/names (Step 4).** Several IDs did not match the names given:
   - `15757` was claimed to be "Node Exporter Full"; the canonical Node Exporter Full dashboard is `1860`.
   - `15661`, `13332`, `7249` did not match the names given in the post (they map to other community dashboards like "K8S Dashboard" by StarsL.cn, "kube-state-metrics-v2", and "Kubernetes Cluster" respectively — not "Kubernetes Cluster Overview", "Kubernetes API Server", or "etcd by Prometheus").
   - `315` ("Kubernetes cluster monitoring (via Prometheus)") was the only correctly identified dashboard.
   Replaced the misidentified list with a note that kube-prometheus-stack already ships dashboards for cluster overview, API server, etcd, and kubelet, then listed only the two correctly identified community supplements (`1860` and `315`).

3. **Broken Grafana import API call (Step 4).** The shown curl used `POST /api/dashboards/import` with a payload of just `{"dashboard": {"id": 15661}}`. The `/api/dashboards/import` endpoint does not work this way — it requires a full dashboard JSON model, not a grafana.com listing ID, and the canonical create/update endpoint in current Grafana is `POST /api/dashboards/db`. As shown the command would not import the dashboard. Replaced with the correct two-step flow: download the dashboard JSON from `grafana.com/api/dashboards/<id>/revisions/latest/download`, then POST to `/api/dashboards/db` with `id` set to null and `overwrite: true`.

4. **Invalid Alertmanager `matchers` flow-style YAML (Step 6).** The post used `matchers: [severity="critical"]`. In YAML flow style, an unquoted scalar containing `=` followed by a double-quoted scalar (`"critical"`) is not valid — flow scalars cannot mix plain and quoted forms within a single node. Alertmanager's docs use block-style lists where each matcher is the literal string. Converted both routes to block-style `matchers:\n  - severity="critical"` form, which parses cleanly and matches the official examples.

## Review Notes
- The SLO availability alert (`SLOAvailabilityBudgetBurn`) is technically correct but uses a single-window threshold (`< 0.999` for 1m). For real production SLOs, the multi-window multi-burn-rate pattern from the SRE workbook is more robust — but a single-window example is acceptable as an introduction.
- `prometheus.prometheusSpec.retentionSize=50GB` is a valid value for the Prometheus CRD `retentionSize` field; Prometheus accepts size suffixes B/KB/MB/GB/TB/PB/EB.
- The Alertmanager `pagerduty_configs.service_key` field is the legacy Events API v1 key. New integrations should prefer `routing_key` (Events API v2), but `service_key` is still supported and not incorrect.
- All Prometheus/kube-state-metrics/etcd metric names referenced (`node_memory_MemAvailable_bytes`, `kube_pod_container_status_restarts_total`, `etcd_disk_backend_commit_duration_seconds_bucket`, etc.) are valid, current metric names.
- The `remoteWrite` block under `prometheusSpec` matches the Prometheus Operator schema for basicAuth secret references.
