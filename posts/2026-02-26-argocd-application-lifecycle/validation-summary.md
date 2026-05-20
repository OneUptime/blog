# Validation Summary: Understanding ArgoCD Application Lifecycle from Creation to Deletion

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- GitOps
- Kubernetes
- Argo CD CLI
- Argo CD sync policies, sync waves, sync windows, rollback, and deletion finalizers

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_delete/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/release-1.8/user-guide/commands/argocd_app_rollback/

## Issues Found
- The CLI creation example did not match the preceding manifest's automated sync, pruning, self-healing, and finalizer behavior. Added `--sync-policy automated`, `--auto-prune`, `--self-heal`, and `--set-finalizer`, which are current `argocd app create` options.
- The deletion diagram said the Application CRD is removed. Deleting an app removes the Application custom resource, not the CRD definition itself. Updated the diagram labels to say "Application resource."
- The deletion section implied deletion behavior depends only on whether the finalizer is already present. Argo CD's CLI defaults to cascading deletion and can add the finalizer, while non-cascading deletion removes it. Updated the wording to distinguish cascading and non-cascading deletion.
- The lifecycle status table stated that in-progress initial syncs and updates are always `Synced`. During an operation, sync status can still be `OutOfSync` while resources are being applied and status is updating. Changed those rows to `OutOfSync or Synced`.
- The best-practice recommendation said to always use the resources finalizer. Argo CD supports both cascading and non-cascading deletion, so the finalizer should be used when cascading deletion is intended. Updated the wording to preserve the recommendation while noting the valid orphaning use case.

## Review Notes
The Argo CD CLI was not installed locally, so command validation was performed against official Argo CD command reference documentation. The post uses "ArgoCD" while the project documentation styles the name as "Argo CD"; this is a naming/style issue rather than a technical correctness issue.
