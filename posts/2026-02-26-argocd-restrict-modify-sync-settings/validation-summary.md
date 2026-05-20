# Validation Summary: How to Restrict Users from Modifying Sync Settings in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Kubernetes ConfigMaps and custom resources
- GitOps
- Argo CD CLI

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/

## Issues Found
- The post originally grouped sync windows with Application spec settings and said all listed settings require `update` on the `applications` resource. Argo CD sync windows are configured on AppProjects under `spec.syncWindows`, so updating them requires project update permissions rather than Application update permissions. Updated the text to distinguish Application-level sync settings from AppProject sync windows.
- The CLI example comment said `argocd app set payment-service --auto-prune` was trying to disable pruning. The official `argocd app set` documentation defines `--auto-prune` as enabling automatic pruning when sync is automated. Updated the comment to say it enables automatic pruning.

## Review Notes
The core RBAC guidance is correct: `applications, sync` permits triggering syncs, while `applications, update` permits modifying the Application object, including `spec.syncPolicy`. The examples use current Argo CD RBAC policy syntax and current Application sync policy fields.
