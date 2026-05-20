# Validation Summary: ArgoCD Self-Healing vs Manual Sync: What to Choose

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes RBAC
- Argo CD CLI

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Kubernetes RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The introduction incorrectly said auto-sync both applies Git changes and reverts manual cluster changes. Updated it to distinguish auto-sync from self-healing, matching Argo CD's documented behavior.
- The "What Self-Healing Actually Does" section described self-healing as having two components and said auto-sync covers manual cluster changes. Updated this to describe automated sync and self-heal as related settings, with self-heal handling live-cluster drift.
- The emergency CLI example re-enabled only `--sync-policy automated`, which does not by itself restore pruning or self-healing. Updated it to use `--sync-policy automated --auto-prune --self-heal`.
- The sync window YAML did not specify any application, namespace, or cluster selector. Added `applications: ['*']` to both windows so the example applies to all applications in the project.
- The post said `argocd.argoproj.io/sync-options: Prune=false` skips self-healing, but that option only prevents pruning. Replaced it with an `ignoreDifferences` example using `RespectIgnoreDifferences=true` for an emergency scaling field.

## Review Notes
The post intentionally uses general environment recommendations rather than version-specific guidance. Argo CD has newer `automated.enabled` behavior in current documentation, but the existing examples using `automated`, `prune`, and `selfHeal` remain valid.
