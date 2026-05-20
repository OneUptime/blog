# Validation Summary: How to Control Ordering Priority When Using Multiple Sources in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD multi-source Applications
- Argo CD sync phases, hooks, and sync waves
- Kubernetes manifests and resource ordering
- Argo CD CLI commands
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Argo CD official documentation: Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD official documentation: Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD official command reference: argocd app get: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD official command reference: argocd app resources: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD official command reference: argocd app manifests: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD official command reference: argocd app sync: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD official command reference: argocd app wait: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD source code for sync kind ordering: https://raw.githubusercontent.com/argoproj/argo-cd/master/gitops-engine/pkg/sync/sync_tasks.go
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The default resource type ordering list was incomplete. Updated it to match Argo CD's current sync kind ordering, including PodDisruptionBudget, list variants, ReplicationController, HorizontalPodAutoscaler, and IngressClass.
- The ResourceQuota example omitted a quota spec. Added a minimal `spec.hard` block so the manifest is a practical, valid example.
- The RoleBinding example omitted required `roleRef` details. Added `subjects` and `roleRef` so the RBAC manifest can be applied as shown.
- The ServiceMonitor example omitted the required `spec`. Added a minimal selector and endpoint based on the Prometheus Operator API.
- The "same wave" explanation said same-kind ordering was not guaranteed. Argo CD sorts by kind and then by name, so this was corrected while preserving the recommendation to use separate waves for logical dependencies.
- The debugging section used `argocd app sync my-app --watch`, but the official Argo CD CLI command reference does not list a `--watch` flag for `argocd app sync`. Replaced it with `argocd app sync my-app`, which waits by default unless `--async` is used.

## Review Notes
The local environment did not have the `argocd` CLI installed, so CLI validation was performed against the official Argo CD command reference rather than local `--help` output. The post's main explanation is accurate: multi-source applications generate and combine manifests from all sources, and sync order is controlled by phase, sync wave, kind, and name rather than by source array position. Argo CD documentation also notes that duplicate resources from multiple sources are resolved by last-source precedence during manifest generation, but that is resource precedence rather than apply ordering.
