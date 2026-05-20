# Validation Summary: How to Sync Only Specific Resources in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD CLI
- Argo CD API
- Argo CD sync options, hooks, and sync waves

## Sources Consulted
- Argo CD Selective Sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/selective_sync/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Sync Applications with Kubectl documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-kubectl/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/

## Issues Found
- The namespace-specific CLI example used `--namespace production`, but the `argocd app sync --resource` selector format identifies namespaced resources as `GROUP:KIND:NAMESPACE/NAME`. Changed the example to `apps:Deployment:production/my-deployment`.
- The resource identification section only documented `GROUP:KIND:NAME`. Added `GROUP:KIND:NAMESPACE/NAME` for namespace-disambiguated resources.
- The API section said every resource identifier needs `group`, `kind`, and `name`. Argo CD operation resource references require `kind` and `name`; `group` and `namespace` are optional. Updated the wording accordingly.
- The limitations section said selective sync does not run sync waves. Official documentation states hooks do not run and selective sync is not recorded in history; wave ordering still belongs to sync processing for selected resources. Reworded the limitation to focus on hooks, history, and the fact that resources outside the selection are not applied.
- The auto-sync limitation said automated sync always performs a full sync. Argo CD automated sync is application-level and does not support a manually selected resource list, but `ApplyOutOfSyncOnly=true` can limit application syncs to out-of-sync resources. Reworded the claim to avoid overstating the behavior.

## Review Notes
The Argo CD CLI was not installed locally, so CLI verification was performed against the official command reference instead of local `--help` output. The post does not pin an Argo CD version; the review used the latest official documentation available on 2026-05-20.
