# Validation Summary: How to Sync Only OutOfSync Resources in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD CLI
- Bash
- jq
- GitHub Actions

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/

## Issues Found
- `argocd app resources --output json` is not supported in current Argo CD documentation. Changed JSON-based resource filtering examples to use `argocd app get --output json` and `.status.resources[]`.
- The manual selective sync examples omitted namespaces in generated `--resource` values. Updated them to include `namespace/name` when a namespace is present, matching the documented resource selector format for disambiguation.
- The automation script used `eval` to build the `argocd app sync` command. Replaced it with a Bash array for safer and more reliable argument handling.
- `argocd app diff --resource` is not a documented current CLI option. Replaced the resource-specific diff example with `argocd app sync --resource ... --dry-run` and clarified that full application diffs come from `argocd app diff`.
- The performance table equated resources with Kubernetes API calls too directly. Reworded it to describe approximate resources applied and apply operations instead of exact API call counts.
- The post described `ApplyOutOfSyncOnly` as different from selective sync, but Argo CD documentation calls it the selective sync option. Clarified that it differs from manually selecting resources with `--resource`.
- The final "ArgoCD sync options documentation" link pointed to a OneUptime sync-windows post instead of the official Argo CD sync-options documentation. Updated the URL to the official documentation.

## Review Notes
The post is technically relevant and now aligns with current Argo CD CLI and sync option documentation. The CI/CD example assumes the Argo CD CLI, `jq`, and the script itself are available in the runner environment.
