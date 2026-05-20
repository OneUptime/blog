# Validation Summary: How to Use Sync Phases in ArgoCD: PreSync, Sync, PostSync

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync phases and resource hooks
- Kubernetes Jobs
- Kubernetes Deployments and Services
- GitOps deployment workflows
- Webhook-based notifications

## Sources Consulted
- Argo CD official documentation: Sync Phases and Waves - https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD official documentation: Resource Hooks - https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_hooks/
- Argo CD official documentation: Resource Hooks hook deletion policies - https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes official documentation: Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- OneUptime linked article: How to Order Resource Deployment with Sync Waves in ArgoCD - https://oneuptime.com/blog/post/2026-02-26-argocd-sync-waves-resource-ordering/view

## Issues Found
- Corrected `PostSync` descriptions to state that PostSync hooks run after resources are successfully applied and healthy, matching Argo CD documentation.
- Corrected `SyncFail` wording from "only if the Sync phase fails" to failure of the sync operation, because Argo CD documents SyncFail hooks as running when a sync operation fails.
- Updated the lifecycle diagram and failure behavior text to show SyncFail as failure handling for the sync operation rather than only the Sync phase.
- Corrected the hook deletion policy best practice. Argo CD defaults to `BeforeHookCreation` when no hook delete policy is specified, so named hook resources are deleted before the next hook creation rather than simply remaining indefinitely after completion.

## Review Notes
The Kubernetes Job examples use current `batch/v1` APIs, valid `restartPolicy: Never`, and valid `backoffLimit` fields. The Argo CD hook annotations and `HookSucceeded` delete policy are current. The external sync-waves link resolves to the intended OneUptime article.
