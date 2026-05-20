# Validation Summary: How to Scrape ArgoCD Metrics with Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD metrics
- Prometheus scrape configuration
- Kubernetes service discovery
- Prometheus Operator ServiceMonitor, PodMonitor, and PrometheusRule CRDs
- kubectl
- PromQL

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/

## Issues Found
- The post stated that ArgoCD exposes metrics from three components. Current Argo CD documentation includes additional metrics endpoints such as ApplicationSet Controller and Commit Server, so the wording was changed to clarify that the guide focuses on three common components.
- The static scrape configuration used `argocd-application-controller-metrics` for the application controller. Official Argo CD documentation lists the application controller metrics endpoint as `argocd-metrics:8082/metrics`, so the target and troubleshooting command were corrected.
- The static scrape configuration used `argocd-repo-server-metrics` for the repo server. Official Argo CD documentation lists the repo server metrics endpoint as `argocd-repo-server:8084/metrics`, so the target was corrected.
- The Kubernetes service discovery relabeling replaced `__address__` with only the annotated port, which would produce an invalid scrape address. The rule now combines the discovered service host with the annotated port.
- The repo server metric category listed cache hit rates, which are not listed in the current official Argo CD repo server metrics. It was changed to pending repository requests.
- The ServiceMonitor troubleshooting command queried ServiceMonitors in the `argocd` namespace even though the example creates the ServiceMonitor in `monitoring`. The namespace was corrected.
- The recording rule for sync failure rate used vector matching that can fail with many-to-many matching. It now aggregates numerator and denominator with `sum(rate(...))`.
- The histogram recording rules did not aggregate bucket series by `le`, and the reconciliation metric used an outdated bucket name. The expressions now use `sum by (le)` and `argocd_app_reconcile_bucket`.

## Review Notes
Prometheus, kubectl, and Prometheus Operator syntax was checked against official documentation. `promtool` and `kubectl` were not installed in the local environment, so command execution and PromQL parsing could not be verified locally.
