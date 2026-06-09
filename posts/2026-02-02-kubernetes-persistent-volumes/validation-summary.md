# Validation Summary: How to Use Kubernetes Persistent Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (PersistentVolume, PersistentVolumeClaim, StorageClass)
- CSI drivers (AWS EBS, NFS, Longhorn, GCP PD, Azure Disk)
- StatefulSets and volumeClaimTemplates
- VolumeSnapshot / VolumeSnapshotClass
- PodDisruptionBudget (policy/v1)
- Deployments with volumeMounts and subPath
- kubectl CLI
- PostgreSQL (used as example workload)

## Sources Consulted
- Kubernetes official documentation — Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes official documentation — Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes official documentation — Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes official documentation — StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes official documentation — PodDisruptionBudget: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- AWS EBS CSI Driver docs: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- GCP PD CSI Driver docs: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- Azure Disk CSI Driver docs: https://github.com/kubernetes-sigs/azuredisk-csi-driver
- Longhorn documentation: https://longhorn.io/docs/

## Issues Found
1. **Incorrect Longhorn CSI provisioner name.** The comment listed `csi.longhorn.io` as the Longhorn provisioner. The official Longhorn provisioner name is `driver.longhorn.io`. Updated.
2. **Deprecated in-tree provisioners listed under a CSI section.** The "Other common provisioners" comment block listed `kubernetes.io/gce-pd` and `kubernetes.io/azure-disk`, which are the legacy in-tree provisioners (deprecated and removed in modern Kubernetes versions). Since the surrounding context is about CSI drivers, updated these to the current CSI provisioner names: `pd.csi.storage.gke.io` (GCP) and `disk.csi.azure.com` (Azure).
3. **Misleading description of `volume.kubernetes.io/storage-provisioner` annotation.** The post described it as a "scheduling hint" that "some schedulers use for placement". In reality this annotation is set automatically by the PVC controller to record which external provisioner is responsible for the PVC; it is not consumed by the scheduler for placement. Updated the surrounding comments to accurately describe the annotation's purpose.

## Review Notes
- All API versions used in the manifests are current (`v1` for PV/PVC, `apps/v1` for Deployment/StatefulSet, `policy/v1` for PodDisruptionBudget, `storage.k8s.io/v1` for StorageClass, `snapshot.storage.k8s.io/v1` for VolumeSnapshot).
- Access mode table is accurate, including `ReadWriteOncePod` (GA in Kubernetes 1.29).
- NFS PV `mountOptions` (`hard`, `nfsvers=4.1`) are valid Linux NFS client options.
- StatefulSet PVC naming convention (`<claimTemplateName>-<statefulSetName>-<ordinal>`) is correctly described.
- Kubelet metric names (`kubelet_volume_stats_used_bytes`, `kubelet_volume_stats_capacity_bytes`) are correct.
- The "Always Set Resource Requests" subsection heading does not actually match its content (which discusses an annotation, not container resource requests). This is a structural/editorial issue rather than a technical inaccuracy and was left as-is per the instructions to only fix technical errors.
- The `Recycle` reclaim policy is correctly noted as deprecated.
- The post uses `postgres:15` in examples; this is a still-supported PostgreSQL major version as of the publication date.
