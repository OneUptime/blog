# Validation Summary: How to configure ArgoCD sync policies for automated pruning and self-healing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- YAML manifests
- Argo CD CLI

## Sources Consulted
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/diffing/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD app command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD app history command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/

## Issues Found
- The AppProject section incorrectly introduced sync windows as default sync policies. AppProjects do not define default automated sync policies; they can define sync windows that control when matching applications may sync. Updated the introductory sentence and YAML comment to describe sync windows accurately.
- The selective resource management section described `ignoreDifferences` as a resource tracking method and implied it fully prevents self-healing from overwriting ignored fields. Argo CD documents `ignoreDifferences` as diff customization, and ignored fields are not respected during sync unless `RespectIgnoreDifferences=true` is enabled. Updated the wording and added the sync option to the example.

## Review Notes
The remaining Application manifests, `automated.prune`, `automated.selfHeal`, retry backoff fields, `CreateNamespace=true`, `PruneLast=true`, `Prune=false`, sync window fields, and listed Argo CD CLI commands are consistent with the official Argo CD documentation reviewed.
