# Validation Summary: How to Set Up ArgoCD for GitOps in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Argo CD
- GitOps
- Helm
- Kustomize
- ApplicationSet
- AppProject
- Prometheus Operator ServiceMonitor and PrometheusRule
- Argo CD Image Updater
- External Secrets Operator

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Helm chart documentation and values: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/release-0.15/basics/update-strategies/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The Helm production values pinned Argo CD to `v2.10.0`, which is outdated for the current stable examples. Updated the example image tag to `v3.4.4`.
- The Helm HA values set `controller.replicas: 2`, while the official chart HA examples keep the application controller at one replica unless dynamic cluster distribution is explicitly enabled. Changed the example to `replicas: 1` and updated the comment.
- The declarative repository Secret omitted `stringData.type: git`, which the official Argo CD declarative repository examples include. Added `type: git`.
- The `allowEmpty: false` comment incorrectly described sync behavior. Updated it to describe its actual purpose: preventing automated pruning when rendered manifests are empty.
- The hook type description for `Sync` implied it was equivalent to wave 0. Reworded it to say it runs during the sync phase.
- The ServiceMonitor selected `app.kubernetes.io/name: argocd-server` while the queried application metrics come from the `argocd-metrics` service. Updated the ServiceMonitor name and selector for the application controller metrics service.
- The metrics list used `argocd_app_reconcile_count` as a primary metric name and described `argocd_redis_request_duration_seconds` as API server request latency. Updated these to `argocd_app_reconcile` and `argocd_kubectl_request_duration_seconds`.
- The GitOps self-healing benefit stated Argo CD automatically corrects drift unconditionally. Qualified it to say Argo CD can do this, since self-healing depends on automated sync configuration.

## Review Notes
The ApplicationSet examples use the default template syntax rather than the newer `goTemplate: true` examples shown in current documentation. This remains valid, but future revisions could modernize those snippets for consistency with current Argo CD docs.
