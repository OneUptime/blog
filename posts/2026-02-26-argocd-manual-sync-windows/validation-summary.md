# Validation Summary: How to Use Manual Sync Windows in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD AppProject sync windows
- Argo CD CLI, API, RBAC, and logging

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD security/auditing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Argo CD `SyncWindow` and `CanSync` source implementation: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- Argo CD command parameters reference source: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cmd-params-cm.yaml

## Issues Found
- The post said that if any active window has `manualSync: false`, manual syncs are blocked. Argo CD applies this stricter rule to active deny windows, while allow-window behavior is evaluated through matching inactive allow windows. Updated the overlap explanation to distinguish deny and allow behavior.
- The post recommended checking `.status.conditions[]` for a `SyncWindow` condition. Official documentation shows the CLI displays sync-window state through `argocd app get`, but `SyncWindow` is not a defined Application condition type. Replaced the JSON condition query with `argocd app get my-app`.
- The audit logging example used `server.audit.enabled`, which is not a documented Argo CD command parameter. Replaced it with documented structured logging settings (`server.log.level` and `server.log.format`) and added Kubernetes Events as the documented audit mechanism for application activity.
- The `argocd app history` sample implied the default CLI table includes an `AUTHOR` column. The command reference only documents the history command and its output formats, and common output includes ID, date, and revision. Updated the sample to show deployment ID, date, and revision, and directed actor attribution to Kubernetes Events/logs.

## Review Notes
The main `manualSync` behavior, sync window YAML fields, CLI sync examples, project window listing command, API sync endpoint pattern, and RBAC policy examples are consistent with current Argo CD documentation. The API endpoint is valid, but production API examples may need extra query parameters for applications outside the default application namespace depending on the installation.
