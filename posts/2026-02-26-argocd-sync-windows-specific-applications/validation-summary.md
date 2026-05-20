# Validation Summary: How to Apply Sync Windows to Specific Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD AppProject sync windows
- Kubernetes custom resources
- Argo CD CLI
- Cron schedules

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/

## Issues Found
- The deny-window examples used `manualSync: true` while the surrounding text described hard blocking behavior. Argo CD sync windows can allow manual syncs to override a blocking window when `manualSync` is enabled, so I changed the hard-block deny examples to `manualSync: false`.
- The verification example queried `.status.conditions` for sync window data. The official Argo CD documentation shows sync window status and assigned windows in the normal `argocd app get APP` output, while sync windows are managed and listed through project window commands. I changed the example to use `argocd app get payment-gateway-prod` and kept `argocd proj windows list production`.

## Review Notes
The remaining AppProject `syncWindows` examples use documented fields: `kind`, `schedule`, `duration`, `applications`, `manualSync`, and `timeZone`. The article's explanation of application-name wildcard matching, multiple matching windows, default allow behavior when no windows match, and project-level scope aligns with the Argo CD sync window documentation.
