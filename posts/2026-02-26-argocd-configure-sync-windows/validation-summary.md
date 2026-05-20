# Validation Summary: How to Configure Sync Windows in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- AppProject resources
- Sync windows
- Kubernetes manifests
- Argo CD CLI
- Cron schedules

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd proj windows` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows/
- Argo CD `argocd proj windows add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_add/
- Argo CD `argocd proj windows update` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_update/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/

## Issues Found
- The post said every sync window has five fields, but Argo CD sync windows have a kind, schedule, duration, and one or more application, namespace, or cluster selectors, with additional supported fields such as `manualSync`, `timeZone`, and `useAndOperator`. Changed the wording to describe the required structure accurately.
- The `allow` and `deny` explanations were too absolute. Updated them to reflect Argo CD's documented behavior: matching allow windows restrict syncing to active allow windows, and deny windows block syncing while active, with deny taking precedence.
- The matching examples used `'*'` in unneeded selector fields. Because Argo CD ORs application, namespace, and cluster selectors by default, those examples would match all applications instead of only the intended selector dimension. Removed the wildcard selectors from the examples and added a note about `useAndOperator: true`.
- The JSON/JQ example for checking current window status referenced `.status.operationState.syncResult`, which is sync result data rather than sync window state. Replaced it with the documented `argocd app get my-app` command, which displays sync window state and assigned windows.

## Review Notes
The remaining commands and manifest fields align with the current Argo CD documentation. The post could later mention the CLI `--time-zone`, `--manual-sync`, and `--use-and-operator` flags in more detail, but the current examples are technically valid.
