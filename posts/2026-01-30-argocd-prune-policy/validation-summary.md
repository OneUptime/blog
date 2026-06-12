# Validation Summary: How to Implement ArgoCD Prune Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Argo CD Application and AppProject custom resources
- Argo CD CLI
- Kubernetes garbage collection and finalizers

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Orphaned Resources Monitoring: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/

## Issues Found
- The post described pruning as deleting "orphaned" resources. Argo CD pruning deletes resources tracked by an application that are no longer in the desired Git state, while orphaned resource monitoring is a separate project-level feature for top-level namespaced resources that do not belong to any Argo CD Application. Updated the relevant wording and diagrams to distinguish stale tracked resources from orphaned resources.
- The AppProject `orphanedResources.ignore` example was presented as project-level prune protection. Official Argo CD documentation defines it as an orphaned resource monitoring ignore list, not a pruning safeguard. Updated the heading, explanation, and comment to reflect that it prevents orphan warnings rather than pruning.
- The per-resource prune annotation section said it applied to resource types. The `argocd.argoproj.io/sync-options: Prune=false` annotation applies to individual resources. Updated the heading and explanation.
- The `argocd app delete myapp --cascade --force` command used an unsupported `--force` flag for `argocd app delete` in the current official command reference. Replaced it with `argocd app delete myapp --cascade --wait`, which uses documented flags.
- The troubleshooting command used `kubectl get all`, which does not include several resource types discussed in the post, such as ConfigMaps, Secrets, and PVCs. Replaced it with an explicit list of common resource types.

## Review Notes
The remaining Argo CD Application fields, sync options, prune propagation policies, auto-prune commands, manual sync commands, orphaned resource command, finalizer name, retry configuration, and sync wave explanations were consistent with the official documentation reviewed. The post does not pin an Argo CD version; the review used the current `latest` official documentation as of 2026-06-12.
