# Validation Summary: How to Manually Sync an Application in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD API
- Kubernetes
- GitHub Actions
- GitOps workflows

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync operation documentation: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/sync-kubectl/
- Argo CD application API Go package reference: https://pkg.go.dev/github.com/argoproj/argo-cd/pkg/apiclient/application

## Issues Found
- The post described force sync as replacing resources instead of applying patches. Argo CD exposes `--force` as force apply behavior, while `--replace` is the CLI option for using `kubectl create/replace` instead of apply. Updated the wording and added the `--replace` command example.
- The UI "Apply Only" description said it skips the comparison phase. Argo CD's apply sync strategy means applying manifests without the default hook-aware strategy. Updated the description to avoid the incorrect comparison-phase claim.
- The dry-run UI description implied that the diff view updates as a direct result of selecting dry run. Argo CD documents dry run as previewing apply without affecting the cluster, so the wording was narrowed to that behavior.

## Review Notes
The core CLI commands, retry flags, resource selector format, `argocd app get --show-operation`, `argocd app get --hard-refresh`, `argocd app wait --health --timeout`, and the API request fields `revision`, `prune`, `dryRun`, and `strategy.apply.force` match current Argo CD documentation. The local `argocd` binary was not installed, so command verification was performed against official Argo CD documentation and API package references.
