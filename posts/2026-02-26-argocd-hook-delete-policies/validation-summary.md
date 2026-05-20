# Validation Summary: How to Configure Hook Delete Policies in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD sync hooks
- Argo CD hook delete policies
- Kubernetes Jobs and Pods
- kubectl commands
- YAML Kubernetes manifests

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said hooks are never automatically deleted when no hook delete policy is specified. Official Argo CD documentation says Argo CD assumes `BeforeHookCreation` when no deletion policy is specified. Updated the default behavior section, comparison table, audit-hook note, and summary to reflect that default.
- The post described successful and failed hook deletion as happening "immediately." Official documentation defines deletion in relation to Argo CD detecting hook or sync completion/failure, not a guaranteed immediate timing. Updated the wording to avoid overpromising exact timing.
- The opening paragraph listed only `PreSync`, `PostSync`, and `SyncFail`. Updated it to include `Sync`, matching the hook phases relevant to normal sync operations.

## Review Notes
The Kubernetes Job examples use valid `batch/v1` structure, `restartPolicy: Never`, `backoffLimit`, and `activeDeadlineSeconds`. The kubectl commands and JSON patch syntax are valid. The OneUptime links in the summary are plausible internal blog links for the related policy guides.
