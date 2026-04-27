# Validation Summary: How to Configure Persistent Storage for Kubernetes Apps in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (PersistentVolume, PersistentVolumeClaim, StorageClass, StatefulSet)
- Portainer (Kubernetes UI)
- kubectl CLI
- PostgreSQL (postgres:15-alpine container image)
- YAML manifests

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Access Modes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Official PostgreSQL Docker image documentation: https://hub.docker.com/_/postgres
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes

## Issues Found
No technical issues found.

## Review Notes
- The PVC and StatefulSet YAML manifests are syntactically correct and use current, non-deprecated apiVersions (`v1` and `apps/v1`).
- Access modes listed (`ReadWriteOnce`, `ReadOnlyMany`, `ReadWriteMany`) are the three classic access modes. Note: Kubernetes also introduced `ReadWriteOncePod` (alpha in v1.22, GA in v1.29) for stricter single-pod enforcement; the omission is not incorrect, just non-exhaustive.
- The PostgreSQL example uses a separate PVC referenced from the StatefulSet's `volumes` section. While this works for `replicas: 1`, the more idiomatic StatefulSet pattern is `volumeClaimTemplates`, which provisions a unique PVC per replica. The current approach is technically valid for the single-replica scenario shown.
- The `postgres:15-alpine` image mounts at `/var/lib/postgresql/data`, which matches the image's documented data directory. Some practitioners set `PGDATA` to a subdirectory (e.g., `/var/lib/postgresql/data/pgdata`) to avoid issues with `lost+found` on some volume types, but the example as written is functionally correct.
- The PVC status values table (Bound, Pending, Lost) matches the documented PVC phases in the Kubernetes API reference.
- `kubectl edit pvc` for expansion is correct; expansion requires the StorageClass to have `allowVolumeExpansion: true`, which the post correctly notes ("requires expandable StorageClass").
