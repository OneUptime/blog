# Validation Summary: How to Fix MDS Server Not Available or Laggy in CephFS

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- CephFS (Ceph filesystem)
- MDS (Metadata Server) daemon
- Kubernetes (container orchestration)

## Sources Consulted
- Ceph official documentation on MDS health checks: https://docs.ceph.com/en/latest/cephfs/health-messages/
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph `ceph tell` command documentation: https://docs.ceph.com/en/latest/man/8/ceph/
- Cross-referenced with other validated blog posts in this repository covering MDS topics (e.g., stuck MDS recovery, MDS journaling, ceph tell commands)

## Issues Found
No technical issues found.

## Review Notes
- The `dmesg` command in the OOM section (`dmesg | grep -i "oom\|killed process" | grep mds`) would need to be run on the Kubernetes host node, not inside a pod. The accompanying `kubectl get events` command provides the Kubernetes-native alternative, so readers have a viable in-cluster option. This is a minor usability note, not an error.
- The `watch` command in the Monitor Recovery section uses `-it` flags with `kubectl exec`, which can occasionally cause terminal rendering issues when combined with `watch`. In practice this works fine for most users.
- The `mds_log_max_segments` default in Ceph is 128; setting it to 64 as shown is a reasonable reduction to limit journal size and speed up replay. This is correct.
- All `ceph tell` and `ceph mds fail` commands correctly use the modern `filesystem:rank` notation (e.g., `cephfs:0`), supported since Ceph Nautilus.
- The CephFilesystem CRD resource specification is accurate for current Rook versions.
