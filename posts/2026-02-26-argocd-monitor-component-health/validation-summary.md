# Validation Summary: How to Monitor ArgoCD Component Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- PromQL
- Grafana dashboards
- Argo CD Helm chart
- Bash, kubectl, curl, jq, and the argocd CLI

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD ApplicationSet controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-applicationset-controller/
- Argo CD notifications monitoring documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/monitoring/
- Argo CD stable install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD Helm chart values and ServiceMonitor templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule resources: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana dashboard listing for dashboard ID 14584: https://grafana.com/grafana/dashboards/14584

## Issues Found
- The post claimed complete monitoring for every Argo CD component, but the examples cover the core Argo CD components and omit optional components such as Dex, Redis, and the commit server. Changed the wording to "core ArgoCD components."
- The first ServiceMonitor used `app.kubernetes.io/part-of: argocd`, which can match unrelated Argo CD services. Changed it to the documented `app.kubernetes.io/name: argocd-metrics` selector.
- The API server ServiceMonitor selected `argocd-server`, but Argo CD exposes the metrics service with `app.kubernetes.io/name: argocd-server-metrics`. Updated the selector.
- The manual ServiceMonitor examples omitted ApplicationSet and notifications metrics despite listing those components. Added ServiceMonitors using the documented selectors.
- The Kubernetes API request metric `argocd_cluster_api_resource_actions_total` is not a current documented Argo CD metric. Replaced it with `argocd_kubectl_requests_total`.
- Several `histogram_quantile` examples passed raw bucket series directly. Updated them to aggregate buckets with `sum by (le) (...)` for overall p95 queries.
- The cluster connection alert used `argocd_cluster_info{connection_status!="Successful"}`, but current docs expose `argocd_cluster_connection_status` for connection state. Updated the alert expression to `argocd_cluster_connection_status == 0`.
- The API server gRPC latency example needed the current caveat that the gRPC handling duration histogram requires `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true`. Added a short note.
- The pod health script used `grep -v "Running\|Completed"` against `kubectl get pods -o wide`, which still prints the header when all pods are healthy. Replaced it with an `awk` check over `--no-headers` output and an explicit healthy message.

## Review Notes
The alert rules still assume Prometheus job labels such as `argocd-metrics`, `argocd-repo-server-metrics`, and `argocd-server-metrics`. Those labels are deployment-dependent with Prometheus Operator and may need adjustment in a real cluster.
