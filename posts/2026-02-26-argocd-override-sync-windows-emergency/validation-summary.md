# Validation Summary: How to Override Sync Windows for Emergency Deployments in ArgoCD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD sync windows
- Argo CD CLI
- Argo CD AppProject configuration and RBAC
- Kubernetes kubectl commands
- Bash scripting

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj windows add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_add/
- Argo CD `argocd proj windows update` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_update/
- Argo CD `argocd proj windows enable-manual-sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_enable-manual-sync/
- Argo CD `argocd proj windows disable-manual-sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_disable-manual-sync/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Kubernetes `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/

## Issues Found
- The post used `argocd proj windows update ... --manual-sync` and `--manual-sync=false`, but current Argo CD CLI documentation exposes manual sync changes through `argocd proj windows enable-manual-sync PROJECT ID` and `argocd proj windows disable-manual-sync PROJECT ID`. Updated the command examples and emergency script accordingly.
- The temporary allow-window option implied that an allow window can bypass a strict blocking window. Argo CD documentation states that active deny windows override active allow windows. Added a caveat that this option helps when syncs are blocked by the absence of an active allow window, not when an active deny window is blocking syncs.

## Review Notes
The overall explanation of `manualSync`, AppProject `syncWindows`, selective sync resources, RBAC policy format, and kubectl last-resort commands matches the official documentation. The emergency script remains a sample runbook and should still be adapted to local audit, backup, and RBAC practices before production use.
