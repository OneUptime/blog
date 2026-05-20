# Validation Summary: How to Monitor Degraded Resources in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana
- Argo CD Notifications
- Slack notifications
- Bash and jq

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications catalog: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/notifications/catalog/
- Argo CD GitOps Engine health package reference: https://pkg.go.dev/github.com/argoproj/gitops-engine/pkg/health
- Argo CD GitOps Engine built-in health check source files for Deployment, Pod, Job, and PVC: https://github.com/argoproj/gitops-engine/tree/master/pkg/health

## Issues Found
- The post stated that Argo CD has five possible health statuses and omitted `Unknown`. I changed the wording and added `Unknown`, because the Argo CD health model includes `Healthy`, `Progressing`, `Degraded`, `Suspended`, `Missing`, and `Unknown`.
- The CLI examples used `argocd app resources my-app -o json`, but the current `argocd app resources` command only documents `tree` and `tree=detailed` output formats. I changed the human-readable resource listing to `argocd app resources my-app --output tree=detailed` and changed the JSON filtering examples to use `argocd app get ... -o json | jq '.status.resources[] ...'`.

## Review Notes
- The Prometheus metric `argocd_app_info` and its `health_status` label are documented for application-level health. It is appropriate for detecting degraded applications, but it does not provide per-resource health details.
- The notification examples use custom triggers and templates; Argo CD also ships a catalog trigger/template named `on-health-degraded` / `app-health-degraded` that teams may prefer to reuse.
