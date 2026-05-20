# Validation Summary: How to Handle Volume Snapshots with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes CSI VolumeSnapshot API
- Kubernetes CronJobs
- Kubernetes RBAC
- PersistentVolumeClaims and CSI storage drivers
- PostgreSQL

## Sources Consulted
- Kubernetes Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Volume Snapshot Classes: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI external-snapshotter README: https://github.com/kubernetes-csi/external-snapshotter/blob/master/README.md
- Kubernetes CSI VolumeSnapshot API reference: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/

## Issues Found
- The VolumeSnapshot CRD and snapshot controller install commands used raw GitHub file URLs and attempted to apply a raw GitHub directory for the controller. The upstream external-snapshotter documentation uses kustomize-based installation commands and notes that the controller namespace should be set appropriately. Updated the commands to clone the official repository, apply the CRDs through `kubectl kustomize`, and apply the snapshot controller kustomization.
- The scheduled snapshot CronJob referenced `serviceAccountName: snapshot-creator` without defining the ServiceAccount or granting RBAC permissions. Added a namespace-scoped ServiceAccount, Role, and RoleBinding with the verbs needed for the `kubectl apply`, list, and delete operations shown in the scheduled and cleanup jobs.
- The Argo CD `ignoreDifferences` example ignored `/spec/source/volumeSnapshotContentName`. The CSI VolumeSnapshot API defines `spec.source` as immutable, and `volumeSnapshotContentName` is for pre-existing snapshots rather than a controller-mutated dynamic snapshot binding. Removed that pointer and kept `/status`.
- The explanatory sentence for snapshot drift mentioned content name bindings happening after snapshot creation. Updated it to refer only to status updates.

## Review Notes
- `VolumeSnapshotClass`, `VolumeSnapshot`, PVC restore, CronJob, Argo CD Application, hook annotations, and `ignoreDifferences` syntax were otherwise consistent with the official documentation reviewed.
- The local environment does not have `kubectl` installed, so command behavior was verified against official documentation rather than local CLI execution.
