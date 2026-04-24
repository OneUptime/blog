# Validation Summary: How to Configure Persistent Storage for Kubernetes Apps in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer for Kubernetes
- Kubernetes PersistentVolumes (PVs) and PersistentVolumeClaims (PVCs)
- Kubernetes StorageClasses
- Kubernetes StatefulSets
- `kubectl`

## Sources Consulted
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Volumes (`subPath` behavior): https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Portainer Kubernetes Volumes: https://docs.portainer.io/2.33-lts/user/kubernetes/volumes
- Portainer Kubernetes Applications (form): https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer Kubernetes Applications (code/manifest): https://docs.portainer.io/sts/user/kubernetes/applications/manifest

## Issues Found
1. **Portainer navigation was inaccurate**: Changed `Cluster → Storage` to `Volumes`, then the `Storage` tab, which matches Portainer's Kubernetes volumes documentation.

2. **Portainer volume creation flow was inaccurate**: Changed `+ Add volume` to `Create from manifest` for the YAML-based PVC example, which matches how Portainer documents adding Kubernetes volumes.

3. **Portainer form section name was inaccurate**: Changed references from `Volumes` to `Persisted folders`, which is the documented section name in Portainer's Kubernetes application form.

4. **Deprecated AWS in-tree provisioner example**: Replaced `kubernetes.io/aws-ebs` with `ebs.csi.aws.com` because the in-tree AWS EBS storage driver was deprecated and removed from modern Kubernetes releases.

5. **Access mode descriptions were too imprecise**: Updated the table to reflect node-level semantics for `ReadWriteOnce`, clarified that `ReadWriteMany` depends on the storage backend, and noted that `ReadWriteOncePod` is CSI-only, available from Kubernetes 1.22+, and stable in 1.29.

6. **PostgreSQL StatefulSet example was invalid**: Added the required `serviceName` and matching `template.metadata.labels` fields so the StatefulSet spec aligns with Kubernetes requirements. Also removed the misleading `subPath` comment that incorrectly framed `subPath` as a permission fix.

7. **Redis StatefulSet example was invalid**: Added the required `serviceName`, `selector`, and matching pod labels so the StatefulSet manifest is structurally correct.

8. **PVC expansion note was inaccurate**: Changed the resize note to reflect Kubernetes behavior more accurately. PVC phase typically remains `Bound` during expansion, and expansion requires a StorageClass with `allowVolumeExpansion: true`.

9. **PVC description was slightly imprecise**: Changed the introduction so PVCs are described as requesting durable storage rather than being the storage resource themselves.

## Review Notes
- The example StorageClass names (`standard`, `fast-ssd`, `nfs`) are illustrative; readers still need to select names that exist in their own cluster.
- The StatefulSet examples now include the required `serviceName` field, but a corresponding Service is still assumed if the workload needs the full StatefulSet network identity behavior described in Kubernetes documentation.
