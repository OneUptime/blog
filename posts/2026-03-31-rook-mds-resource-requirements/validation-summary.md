# Validation Summary: How to Configure MDS Resource Requirements in Rook (Minimum 4GB Memory)

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes (resource requests/limits, QoS classes, pod scheduling)
- Prometheus (monitoring and alerting)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph MDS cache configuration: https://docs.ceph.com/en/latest/cephfs/cache-configuration/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes QoS classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Rook configuration override ConfigMap: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found
1. **Incorrect byte value for `mds_cache_memory_limit` (Steps 3 and 4)**: The post stated that 85% of the 8Gi memory limit is ~6.8GB and used the byte value `6442450944`. However, `6442450944` is exactly 6 GiB (6 × 1024³), which is only 75% of 8 GiB — not 85%. The correct value is `7301444403` (0.85 × 8 × 1024³ ≈ 7,301,444,403 bytes ≈ 6.8 GiB). Fixed in both the `ceph config set` command in Step 3 and the `rook-config-override` ConfigMap in Step 4. Also corrected "GB" to "GiB" in comments for consistency with Kubernetes binary units.

## Review Notes
- Step 6 ("Configure Annotations for Memory Management") is somewhat misleading. The title suggests annotations control OOM behavior, but it is actually the QoS class (determined by resource requests/limits equality) that affects OOM priority. The first YAML snippet shows an `annotations:` key with only comments and no actual annotation values. The section does correctly explain Guaranteed QoS via requests = limits, but the framing around annotations is a pedagogical issue rather than a code error.
- The Prometheus metric `ceph_mds_cache_size_bytes` referenced in Step 7 comments may not exist under that exact name in all Ceph versions. The actual metric name varies; some versions expose `ceph_mds_cache_size` or similar. Since this appears only in a code comment and not in an executable alert, it is not a blocking issue.
- The troubleshooting section comment `# 3GB` for value `3221225472` is colloquially acceptable but technically imprecise — the value is 3 GiB (≈3.22 GB). This is common usage and not corrected.
- All CephFilesystem CRD YAML structures, field names, and Kubernetes resource specifications are correct for current Rook versions.
- All kubectl and ceph CLI commands use correct syntax and flags.
