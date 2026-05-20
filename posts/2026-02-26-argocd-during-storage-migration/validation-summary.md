# Validation Summary: How to Handle ArgoCD During Storage Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD / GitOps
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses and CSI drivers
- Kubernetes Jobs
- kubectl
- BusyBox shell utilities

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd_app_set/
- Argo CD sync options and `RespectIgnoreDifferences`: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_sync/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl scale` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Local BusyBox 1.36.1 `cp --help` output and copy behavior test.

## Issues Found
- The post said auto-sync could simply revert a migrated PVC to the old StorageClass. A bound PVC's StorageClass is immutable, so Argo CD may instead fail while applying the old desired state or prune transitional resources if pruning is enabled. Updated the explanation and diagram to avoid implying Kubernetes supports in-place StorageClass reversal.
- The `ignoreDifferences` example omitted `RespectIgnoreDifferences=true`. Argo CD uses `ignoreDifferences` for diffing by default, but sync behavior requires this sync option when the ignored fields must also be respected during apply. Added the sync option and explanatory text.
- The migration job used `cp -av /old-data/* /new-data/`, which misses dotfiles and can fail on empty directories. Changed it to `cp -a /old-data/. /new-data/`, verified against BusyBox 1.36 behavior.
- The "Update Git Manifests" example created `my-data-new` but then showed a Git PVC named `my-data`, which conflicted with the new-PVC migration path and could lead to an empty replacement PVC. Updated the example to use `my-data-new` and clarified that keeping the old PVC name requires creating a replacement and restoring or copying data into it.
- The coordination steps were ambiguous about deleting the old PVC before Git stopped referencing it. Updated the step to state that Git should reference the new PVC name and that the old PVC should only be deleted after data has been copied and Git no longer references it.

## Review Notes
- The `app.kubernetes.io/instance` label is a common Argo CD tracking label, but Argo CD installations can use annotation-based or custom tracking. The wording now identifies it as the common label rather than a universal management label.
- Volume expansion guidance is accurate for supported drivers when the StorageClass has `allowVolumeExpansion: true`; Kubernetes only supports growing volumes, not shrinking them.
