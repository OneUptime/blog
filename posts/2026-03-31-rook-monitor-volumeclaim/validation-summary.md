# Validation Summary: How to Use VolumeClaimTemplates for Monitor Storage in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph (CephCluster CRD)
- Ceph Monitors (Mons)
- Kubernetes PersistentVolumeClaims (PVCs)
- Kubernetes StorageClasses
- AWS EBS CSI Driver (gp3 volumes)
- Kubernetes Topology Spread Constraints

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook example configurations (cluster-on-pvc.yaml): https://rook.io/docs/rook/latest/Getting-Started/example-configurations/
- AWS EBS CSI Driver parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- Kubernetes StorageClass documentation (allowVolumeExpansion, volumeBindingMode)

## Issues Found
No technical issues found.

## Review Notes
- The Rook CRD docs note that only `storageClassName` and `storage` resource requests/limits are the fields Rook internally processes from the volumeClaimTemplate. However, `metadata.labels` and `spec.accessModes` are standard PVC spec fields that are passed through to the created PVC objects. This usage is consistent with Rook's own `cluster-on-pvc.yaml` example and is not an error.
- The PVC naming convention `rook-ceph-mon-<id>` (e.g., rook-ceph-mon-a) is consistent with observed Rook runtime behavior, though the naming pattern is not explicitly documented in the CRD reference.
- The gp3 throughput default is technically 125 MiB/s (mebibytes per second), not 125 MB/s. The post uses the value `"125"` in the StorageClass parameter which is correct — the EBS CSI driver interprets this as MiB/s.
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Ceph Squid) is a valid release version.
