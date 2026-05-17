# Validation Summary: How to Configure Victoria Metrics on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- VictoriaMetrics (single-node and cluster versions)
- vmagent
- Helm (VictoriaMetrics Helm charts: `victoria-metrics-single`, `victoria-metrics-cluster`, `victoria-metrics-agent`)
- Prometheus (remote_write, kube-prometheus-stack)
- Grafana (sidecar-discovered datasource ConfigMap)
- Kubernetes service discovery (`kubernetes_sd_configs`: endpoints, node, pod)
- Talos Linux (deployment target)
- PromQL / MetricsQL

## Sources Consulted
- VictoriaMetrics Helm charts repository — https://github.com/VictoriaMetrics/helm-charts (chart names, value structure for `server`, `vminsert`, `vmselect`, `vmstorage`)
- VictoriaMetrics docs — https://docs.victoriametrics.com/ (single-node default port 8428; cluster ports vminsert 8480, vmselect 8481; URL paths `/insert/<accountID>/prometheus/api/v1/write` and `/select/<accountID>/prometheus`; CLI flags `-envflag.enable`, `-envflag.prefix`, `-dedup.minScrapeInterval`, `-search.maxQueryDuration`, `-replicationFactor`; `retentionPeriod` integer = months)
- VictoriaMetrics cluster docs — https://docs.victoriametrics.com/cluster-victoriametrics/ (component roles and read/write URL formats)
- Prometheus remote_write spec — https://prometheus.io/docs/practices/remote_write/ (`queue_config` fields: `max_samples_per_send`, `capacity`, `max_shards`)
- kube-prometheus-stack Helm chart — https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack (`prometheus.prometheusSpec.remoteWrite` shape)
- Grafana sidecar datasource provisioning — https://grafana.com/docs/grafana/latest/administration/provisioning/#data-sources (ConfigMap with label `grafana_datasource: "1"`, `apiVersion: 1` body)
- Kubernetes ServiceAccount token & CA paths (`/var/run/secrets/kubernetes.io/serviceaccount/{token,ca.crt}`)
- Sibling post `posts/2026-03-13-deploy-victoriametrics-single-node-flux-cd/README.md` for the actual installed service name pattern (`victoria-metrics-single-server`)

## Issues Found
- **Single-node service name did not match the install command.** The post referenced `victoria-metrics-server.monitoring.svc.cluster.local:8428` in the Prometheus remote_write URL, Grafana datasource URL, and vmagent values. With `helm install victoria-metrics vm/victoria-metrics-single`, the chart's fullname helper produces `victoria-metrics-victoria-metrics-single` (because the release name does not contain the chart name), so the actual server Service is `victoria-metrics-victoria-metrics-single-server` — never `victoria-metrics-server`. Following Prometheus would have hit a non-existent DNS name. **Fix:** changed the release name to `victoria-metrics-single` (which does contain the chart name, so the fullname collapses to `victoria-metrics-single`) and updated all three URL references to `victoria-metrics-single-server.monitoring.svc.cluster.local:8428`. This matches the naming used in the existing sibling VictoriaMetrics posts in this repo.

## Review Notes
- The cluster release name `victoria-metrics-cluster` already collapses correctly (release name contains chart name), so the cluster Service names `victoria-metrics-cluster-vminsert` (port 8480) and `victoria-metrics-cluster-vmselect` (port 8481) are correct as written.
- `retentionPeriod: "6"` / `"12"` are interpreted as months by VictoriaMetrics' `-retentionPeriod` flag (the default unit when no suffix is given), which is what the post implies.
- The cluster vminsert/vmselect write/read URL paths (`/insert/0/prometheus/api/v1/write` and `/select/0/prometheus`) use tenant ID `0`, which is the standard single-tenant default for the cluster build.
- The "Performance Comparison" table is presented as rough/illustrative numbers; this is fair framing — exact ratios depend heavily on workload, scrape interval, cardinality, and storage class.
- `dedup.minScrapeInterval` is only effective when more than one writer (e.g., HA Prometheus pair) sends overlapping samples; with a single Prometheus it is harmless but unnecessary.
- The Grafana ConfigMap relies on the kube-prometheus-stack/Grafana sidecar being enabled and watching the `monitoring` namespace with the `grafana_datasource=1` label selector — readers using a custom Grafana install may need to wire the datasource differently.
