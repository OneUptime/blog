# Validation Summary: How to Apply Sync Windows to Specific Namespaces in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- AppProject sync windows
- Argo CD CLI
- jq

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD `argocd proj windows update` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_update/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/

## Issues Found
- Sync window selector semantics were incorrect for examples that combined `applications: '*'` with `namespaces`. Argo CD ORs application, namespace, and cluster selectors by default, so those examples would have matched all applications rather than only applications in the target namespace. Added `useAndOperator: true` to the affected examples and clarified the explanation.
- The "Combining Namespace and Application Patterns" section described selector matching too loosely and recommended a deny-window approach that could overlap the intended payment allow window. Updated the note to explain `useAndOperator: true`, the broader `*` match, and safer ways to exclude payment apps from the broader production window.
- The verification command attempted to read sync-related conditions from `.status.conditions[]`, which may not exist and is not the documented way to view sync window state. Replaced it with `argocd app get my-app` for sync window state and kept a JSON command focused on the destination namespace.

## Review Notes
The post is accurate after the fixes. The examples use current Argo CD sync window fields including `manualSync`, `timeZone`, and `useAndOperator`.
