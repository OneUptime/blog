# Validation Summary: How to Automate Calico Component Metrics Monitoring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Calico
- Kubernetes
- Tigera Operator
- Prometheus Operator
- kube-prometheus-stack
- PromQL
- Flux CD
- Kustomize
- Grafana dashboard provisioning
- Bash, kubectl, curl, and jq

## Sources Consulted
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Monitoring Typha with Prometheus: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico documentation: Monitoring kube-controllers with Prometheus: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: KubeControllersConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Prometheus documentation: Query functions and histogram_quantile: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- kube-prometheus-stack values and templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Grafana Helm chart sidecar dashboard documentation: https://artifacthub.io/packages/helm/grafana/grafana

## Issues Found
- The GitOps tree and Kustomize resource list omitted the Grafana dashboard ConfigMap even though the post says dashboards are managed as code. Added `grafana-dashboard.yaml` to both examples.
- The Flux `healthChecks` example targeted a `ServiceMonitor`. Flux health checks depend on Kubernetes/kstatus-compatible readiness or explicit custom health expressions, and a bare ServiceMonitor existence check does not validate scraping health. Removed the misleading health check snippet and adjusted the conclusion to describe dependency ordering instead.
- The Grafana dashboard used the legacy `graph` panel type. Changed the time-series panels to `timeseries`.
- The Felix p99 PromQL used `histogram_quantile()` directly over bucket rates. For an aggregated classic histogram query, Prometheus requires preserving the `le` label with `sum by (le) (...)`. Updated both dashboard and alert expressions.
- The Typha dashboard query used `typha_connections_total`, which is not a documented Typha metric. Replaced it with `typha_connections_active`.
- The alert and validation script matched `up{job="calico-felix-metrics"}`. Prometheus Operator defaults the `job` label to the associated Service name when `jobLabel` is not set, so the example now matches `felix-metrics-svc`.
- The PrometheusRule labels did not include the default kube-prometheus-stack selector label. Added `release: kube-prometheus-stack` to match default chart behavior when the Helm release has that name.

## Review Notes
- The ServiceMonitor and Service manifests are referenced but not shown in the post. In a real repository, the ServiceMonitor selectors, namespace selectors, and port names must match the Calico metrics Services and the kube-prometheus-stack `serviceMonitorSelector`.
- The `release: kube-prometheus-stack` label assumes the Helm release is named `kube-prometheus-stack`. If the monitoring chart is installed with a different release name or custom selectors, that label must be adjusted.
- Calico metric availability and ports can vary by installation mode and configuration; the post correctly frames namespace and label selectors as cluster-specific values.
