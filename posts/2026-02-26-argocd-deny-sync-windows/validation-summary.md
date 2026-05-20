# Validation Summary: How to Create Deny Sync Windows to Prevent Deployments in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD AppProject sync windows
- Argo CD CLI
- Kubernetes custom resources
- Cron schedules

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj windows` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows/
- Argo CD `argocd proj windows add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_add/
- Argo CD `argocd proj list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/

## Issues Found
- The testing section said `argocd app sync my-app` should fail for auto-sync. `argocd app sync` is a manual sync command, and Argo CD sync windows can allow manual syncs with `manualSync: true`. I changed the example to check window state with `argocd app get my-app`, then test a manual sync specifically during a deny window configured with `manualSync: false`.
- The testing section attempted to inspect sync window state through `.status.conditions[]` in JSON output. The official Argo CD sync window documentation shows sync window state through `argocd app get APP`, including `SyncWindow` and `Assigned Windows` in the CLI output. I replaced the JSON/JQ example with the documented CLI check.

## Review Notes
- The AppProject YAML fields `syncWindows`, `kind`, `schedule`, `duration`, `applications`, `manualSync`, and `timeZone` match the official Argo CD documentation.
- The CLI flags used in the scale-management example, including `--kind`, `--schedule`, `--duration`, `--applications`, and `--manual-sync`, match the official Argo CD command reference. The Argo CD CLI was not installed locally, so CLI validation was performed against official documentation rather than local `--help` output.
