# Validation Summary: How to Integrate ArgoCD with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- Helm
- PromQL

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana pie chart documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/pie-chart/
- Artifact Hub kube-prometheus-stack chart listing: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack/

## Issues Found
- The Argo CD ServiceMonitor examples used selectors for `argocd-application-controller` and `argocd-server`, but the official Argo CD metrics documentation selects the metrics Services with `app.kubernetes.io/name: argocd-metrics` and `app.kubernetes.io/name: argocd-server-metrics`. Updated the ServiceMonitor names/selectors accordingly.
- The notifications ServiceMonitor selected `argocd-notifications-controller`, but the documented metrics Service label is `argocd-notifications-controller-metrics`. Updated the selector.
- The annotation example referenced `argocd-application-controller-metrics`; the documented application controller metrics endpoint is exposed by the `argocd-metrics` Service. Updated the command.
- The overview implied all API server gRPC metrics are always available. Added the documented `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true` caveat.
- Several PromQL examples referenced undocumented metrics or labels: `argocd_app_reconcile_count{result=...}`, `argocd_app_resource_info`, and `argocd_git_request_total{request_type="fetch", result="error"}`. Replaced them with documented metrics: `argocd_app_reconcile_count`, `argocd_app_orphaned_resources_count`, `argocd_cluster_api_resource_objects`, and `argocd_git_fetch_fail_total`.
- The initial reconciliation histogram example did not aggregate classic histogram buckets by `le`, which is the documented Prometheus pattern for aggregate quantiles. Updated it to use `sum(rate(..._bucket[5m])) by (le)`.
- The reconciliation error-rate example used a non-existent `result` label on `argocd_app_reconcile_count`. Replaced it with a Kubernetes request error-rate query using documented `argocd_kubectl_requests_total` labels.
- The Git fetch failure alert used undocumented labels on `argocd_git_request_total`. Updated it to use `argocd_git_fetch_fail_total`.
- The kube-prometheus-stack chart revision was outdated. Updated `targetRevision` from `55.0.0` to the current Artifact Hub listed version, `85.2.0`.
- The Argo CD Application example referenced a `monitoring` AppProject without defining it. Updated the example to use the built-in `default` project.

## Review Notes
- JSON dashboard snippets were parsed successfully with Node.js.
- Local `kubectl`, `helm`, `argocd`, Ruby, and YAML parser tools were not installed in the workspace, so CLI/config validation was performed against official documentation and the YAML was reviewed manually.
