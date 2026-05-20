# Validation Summary: How to Apply Sync Windows to Specific Clusters in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProject sync windows
- Argo CD CLI
- Kubernetes multi-cluster deployment targeting
- Cron schedules and time zones
- jq

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd proj windows` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows/
- Argo CD `argocd proj windows add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_add/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Declarative Setup documentation for cluster configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters

## Issues Found
- The regional rollout example used fixed UTC schedules while describing 2 AM local windows. This is only accurate for London, US Eastern, and US Pacific during standard time, not during daylight saving time. Added a daylight-saving caveat and clarified the affected comments.
- The `jq` command for application conditions used `.status.conditions[]`, which can fail when `conditions` is absent or null. Changed it to `(.status.conditions // [])[]` so the command works for applications with no conditions.

## Review Notes
Argo CD's official documentation confirms that AppProject sync windows support `clusters`, `applications`, `namespaces`, `manualSync`, `timeZone`, wildcard matching, and the `argocd proj windows add/list/delete` workflow shown in the post. The local environment did not have the `argocd` CLI installed, so CLI flags were verified against the official Argo CD command reference instead of local `--help` output.
