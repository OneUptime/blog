# Validation Summary: How to Implement Rollback Strategies in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes Deployments
- kubectl
- Helm applications in Argo CD
- Prometheus alerting
- Argo CD Notifications
- Git

## Sources Consulted
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD selective sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/selective_sync/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Expr language definition: https://expr-lang.org/docs/language-definition
- Kubernetes `kubectl rollout undo` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes Deployment rollback documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Argo Rollouts `abort` command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/
- Argo Rollouts `undo` command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_undo/

## Issues Found
- Clarified that an Argo CD rollback syncs manifests from an older revision without changing the Application's configured `targetRevision`; the previous wording implied the Application itself points to the older commit.
- Replaced the commented-out auto-sync YAML with `syncPolicy.automated.enabled: false`, which matches current Argo CD documentation for explicitly disabling automated sync while preserving `prune` and `selfHeal` settings.
- Adjusted the Argo Rollouts abort comment because the official command keeps the previous ReplicaSet active but does not fully revert `spec.template` by itself.
- Fixed the Argo CD Notifications trigger expression from `length` to `len(...)`, matching the Expr language functions used by Argo CD notifications.

## Review Notes
- The rollback, sync, history, wait, selective sync, pruning, Kubernetes rollout undo, and Argo Rollouts undo commands are consistent with current official documentation.
- Argo CD documentation states rollback cannot be performed while automated sync is enabled, so disabling automated sync before rollback is required, not just a convenience.
- The Prometheus example detects frequent successful syncs as a proxy for possible rollbacks; Argo CD's documented `argocd_app_sync_total` metric is a sync-history counter rather than a rollback-specific counter.
