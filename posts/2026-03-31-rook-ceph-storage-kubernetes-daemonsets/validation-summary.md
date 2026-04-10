# Validation Summary: How to Use Ceph Storage with Kubernetes DaemonSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephFS, RBD, RGW)
- Kubernetes DaemonSets
- Kubernetes PersistentVolumeClaims (ReadWriteMany)
- Fluent Bit (log collection example)
- AWS CLI S3 (for RGW object storage uploads)
- Kubernetes Downward API (spec.nodeName)
- subPathExpr for per-node volume subdirectories

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes subPathExpr documentation: https://kubernetes.io/docs/concepts/storage/volumes/#using-subpath-expanded-environment
- Kubernetes Downward API (fieldRef spec.nodeName): https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Rook CephFS storage class documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook Ceph Object Store (RGW) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Fluent Bit Docker Hub image: https://hub.docker.com/r/fluent/fluent-bit
- Ceph CLI reference for `ceph fs status`: https://docs.ceph.com/en/latest/cephfs/administration/

## Issues Found
1. **Incorrect Fluent Bit container image name**: The post used `fluentbit:latest` which is not a valid Docker Hub image. Changed to `fluent/fluent-bit:latest`, which is the official Fluent Bit image on Docker Hub.
2. **Misleading monitoring command**: The command `ceph df detail | grep agent-shared` would not produce useful output because `ceph df` displays pool-level statistics (e.g., `cephfs-data`, `cephfs-metadata`), not PVC or subvolume names. Replaced with `ceph fs status`, which shows CephFS filesystem status including active MDS, client connections, and pool usage — more relevant for verifying CephFS-backed DaemonSet storage.

## Review Notes
- The RGW metrics upload example does not include S3 credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). This is acceptable since the example focuses on the pattern rather than complete authentication setup, but readers will need to add credential configuration (e.g., via Kubernetes Secrets) for a working deployment.
- The `metrics-agent:latest` image in the RGW example is a placeholder, not a real image. This is clear from context and acceptable for illustrative purposes.
- The `subPathExpr` feature became GA in Kubernetes 1.17, so it works on all modern Kubernetes versions without a feature gate.
- The post correctly notes that RBD (ReadWriteOnce) PVCs can be used per-pod but does not provide an example, since DaemonSets don't support volumeClaimTemplates like StatefulSets do. This is a valid architectural point worth noting but not an error.
