# Validation Summary: How to Handle Emergency Deployments Bypassing Normal Flow

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize image overrides
- GitHub CLI
- Argo CD RBAC and AppProjects
- Bash scripting

## Sources Consulted
- Argo CD parameter overrides documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/parameters/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_unset/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD AppProject documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Kubernetes `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl command reference for rollout and scale: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- GitHub CLI `gh pr create` and `gh pr merge` local help output.

## Issues Found
- The fast-track script printed `.spec.source.targetRevision` as a number of seconds until Argo CD sync. That field is the tracked Git branch, tag, or revision, not a sync interval. Changed the message to say Argo CD syncs after the change reaches the tracked branch.
- The same script created a PR and then called `gh pr merge` without explicitly identifying the PR. While `gh pr merge` can infer the current branch in many cases, capturing the PR URL from `gh pr create` and passing it to `gh pr merge` makes the non-interactive emergency script more reliable and matches the GitHub CLI command contract.
- The parameter override section said Argo CD allows parameter overrides during sync and that the application would show as `OutOfSync` because Git does not match live state. Argo CD parameter overrides are set before sync and become part of the Application's desired state, so after syncing the app can show as `Synced` even though the source of truth is now Git plus the override. Updated the explanation and added `argocd app unset ... --kustomize-image` after Git reconciliation.
- The rollback helper used `argocd app history $APP --output json`, but the current official command reference only lists `wide` and `id` output for `argocd app history`. Changed it to use `argocd app get $APP --output json` and read `.status.history`.

## Review Notes
The remaining examples are technically plausible but intentionally operational templates. Teams should adapt them to their own Application ownership model, especially when Applications are managed by ApplicationSets or app-of-apps patterns, because direct `argocd app set` changes can be reconciled by the parent source of truth.
