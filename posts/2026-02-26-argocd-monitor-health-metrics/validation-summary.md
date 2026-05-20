# Validation Summary: How to Monitor ArgoCD Application Health with Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- PromQL
- Grafana
- Argo CD CLI

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/metrics/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The post used `argocd app list --health-status Degraded`, but the official `argocd app list` command does not provide a `--health-status` flag. Changed the example to list applications in wide output and filter for `Degraded`.
- The post used `argocd app resources my-degraded-app --health-status Degraded`, but the official `argocd app resources` command does not provide a `--health-status` flag. Changed the example to use `--output tree=detailed`, which is documented and includes resource health information.
- The dashboard section labeled the recording-rule example as "Time Since Last Degraded", but the rules only calculate degraded application count and healthy percentage. Renamed the panel description to match what the recording rules actually compute.

## Review Notes
- The `argocd_app_info` metric and its `health_status` and `sync_status` labels are documented by Argo CD and are appropriate for the PromQL examples.
- Argo CD application health is derived from immediate child resources and their health checks. Future revisions could mention that resource health is not recursively inherited from grandchildren unless the parent resource health check exposes that state.
