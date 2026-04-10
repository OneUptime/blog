# Validation Summary: How to Compare Ceph vs NetApp ONTAP for Enterprise Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph Kubernetes operator)
- NetApp ONTAP (enterprise storage OS)
- NetApp Trident (Kubernetes CSI driver)
- Kubernetes (container orchestration)
- CephFS, RBD, RADOS Gateway (Ceph subsystems)
- SnapMirror, SnapVault (NetApp replication)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- NetApp Trident TridentBackendConfig documentation: https://docs.netapp.com/us-en/trident/trident-use/backend-kubectl.html
- NetApp ONTAP S3 object storage documentation: https://docs.netapp.com/us-en/ontap/s3-config/index.html
- Ceph RADOS Gateway documentation: https://docs.ceph.com/en/latest/radosgw/
- NetApp StorageGRID vs ONTAP S3 comparison: https://docs.netapp.com/us-en/ontap/s3-config/s3-support-concept.html

## Issues Found
1. **S3 protocol attribution for NetApp ONTAP was incorrect.** The Protocol Support Comparison table listed S3 support for NetApp as "Yes (StorageGRID)". StorageGRID is a separate NetApp product. ONTAP itself has supported native S3 object storage since ONTAP 9.8 (released 2020). Changed to "Yes (native, ONTAP 9.8+)" to accurately reflect ONTAP's built-in S3 capability.

## Review Notes
- The Swift-compatible API listed in the Architecture Comparison table under Ceph protocols has been deprecated in Ceph RGW in favor of S3. It remains functional but is no longer actively developed. Future updates to the post may want to remove or de-emphasize Swift.
- SnapVault has been unified with SnapMirror since ONTAP 9.3 — SnapVault is now a SnapMirror policy type (vault policy). Both names are still commonly used, so the current phrasing is acceptable but could be modernized.
- The CephCluster YAML example is simplified and omits the `cephVersion.image` field, which is required for an actual deployment. This is acceptable for an illustrative comparison but readers should be aware it is not a complete working configuration.
- The Trident YAML example omits credentials (username/password or secret reference), which would be required for a real backend configuration. Similarly acceptable for illustration purposes.
- Cost figures are approximate ranges and will shift over time; they are reasonable as of the publication date.
