# Validation Summary: How to Deploy Multiple YAML Files from a Directory with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD directory sources
- Argo CD sync waves and pruning
- Argo CD CLI
- Kubernetes YAML manifests

## Sources Consulted
- Argo CD Directory documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get-resource/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_manifests/

## Issues Found
- The resource tree CLI example used `argocd app get payment-service --show-operation`, which shows operation details rather than the resource hierarchy. Changed it to `argocd app resources payment-service --output tree`, which is documented for showing parent-child resource relationships.
- The specific resource details CLI example used `argocd app resources payment-service --kind Deployment`, but `argocd app resources` does not support a `--kind` flag. Changed it to `argocd app get-resource payment-service --kind Deployment --resource-name payment-api`, which is the documented command for live resource details.
- The pruning section said resources show as "orphaned" without pruning. Argo CD documents removed desired resources as needing pruning and leaving the app out of sync; orphaned resource monitoring is a separate project-level feature for resources that do not belong to any Argo CD Application. Updated the wording accordingly.
- The labeling best practice said consistent labels let Argo CD track resources properly. Argo CD resource tracking is handled by its configured tracking method, such as tracking annotations or instance labels. Updated the line to describe labels as useful for human and Kubernetes querying/grouping instead.

## Review Notes
The main directory, recursion, sync wave, automated pruning, selective sync, and manifest rendering examples are consistent with current Argo CD documentation. The `argocd` CLI was not installed locally, so command validation was performed against official Argo CD command reference pages.
