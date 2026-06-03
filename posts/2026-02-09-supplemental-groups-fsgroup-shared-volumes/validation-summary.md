# Validation Summary: How to Configure supplementalGroups and fsGroup for Shared Volume Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes Pod security context
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StatefulSets and Deployments
- Linux file permissions, users, and groups
- NFS volumes

## Sources Consulted
- Kubernetes: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes: Share Process Namespace between Containers in a Pod - https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes: Volumes - https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes API Reference: PersistentVolume v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/
- Kubernetes API Reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- The `fsGroup` explanation said it runs container processes "with that group", which could imply the primary group changes. Updated it to clarify that `fsGroup` adds the group as a supplementary group and applies ownership changes only to supported volumes.
- The sample `id` output for the `fsGroup` pod omitted the primary root group from the supplementary group list. Updated it to show `groups=0(root),2000`.
- The PostgreSQL StatefulSet example included a standalone PVC named `postgres-pvc`, but the StatefulSet used `volumeClaimTemplates` named `data`, so the standalone PVC was unused. Removed the unused PVC from the snippet.
- The config reloader sidecar attempted to signal a process in another container without enabling a shared process namespace. Added `shareProcessNamespace: true` and the `SYS_PTRACE` capability required by the Kubernetes process namespace sharing example.
- The static NFS PV/PVC example did not force the shown PVC to bind to the shown PV and could be affected by a default StorageClass. Added `storageClassName: ""` and `volumeName: nfs-pv` to the PVC.
- The NFS section implied `fsGroup` alone guarantees access. Updated the wording to note that the NFS export and directory permissions must also allow the configured groups.

## Review Notes
- `kubectl` was not installed in the local environment, so command validation was performed against Kubernetes documentation rather than local `kubectl --help` output.
- YAML code blocks were parsed successfully with PyYAML after the fixes.
