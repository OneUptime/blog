# Validation Summary: How to Configure Ceph Storage for Financial Services

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- CephBlockPool CRD
- Kubernetes StorageClass with CSI encryption
- CephCluster network encryption (msgr2)
- CephObjectStore / Ceph RADOS Gateway (RGW)
- S3 Object Lock (COMPLIANCE mode)
- HashiCorp Vault (KMS integration)
- Prometheus / PromQL (monitoring)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Ceph CSI Drivers (encryption parameters): https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook CephCluster CRD (network encryption): https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook CephObjectStore CRD: https://www.rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph RGW S3 Object Lock / compliance validation: https://ceph.io/en/news/blog/2025/rgw-deep-dive-3/

## Issues Found

### 1. Section title incorrectly described Ceph msgr2 encryption as "TLS"
- **What was wrong:** The section "Configuring TLS for All Ceph Traffic" implied the configuration enables TLS. In reality, `spec.network.connections.encryption.enabled: true` enables Ceph's msgr2 protocol-level encryption, which is a different mechanism from TLS. Msgr2 uses CephX-based key exchange with AES-GCM encryption.
- **What was changed:** Renamed the section to "Enabling In-Transit Encryption for All Ceph Traffic".
- **Why:** To prevent readers from believing they have configured TLS when they have actually configured Ceph's native msgr2 encryption. Both encrypt data in transit, but they are distinct protocols.

### 2. PromQL query referenced a non-existent histogram metric
- **What was wrong:** The query used `histogram_quantile(0.99, rate(ceph_osd_op_w_latency_bucket{...}[5m]))`. The metric `ceph_osd_op_w_latency_bucket` does not exist in Ceph's Prometheus module. Ceph exports OSD write latency only as `_sum` and `_count` pairs (not as a Prometheus histogram with `_bucket` series). The `histogram_quantile()` function requires histogram-type metrics with bucket labels.
- **What was changed:** Replaced with `rate(ceph_osd_op_w_latency_sum[5m]) / rate(ceph_osd_op_w_latency_count[5m]) * 1000 > 5`, which computes average write latency from the available summary metrics. Updated the surrounding text and comment to say "average" instead of "P99".
- **Why:** The original query would fail at evaluation time since the metric doesn't exist. The replacement uses metrics that Ceph actually exports and produces a meaningful latency value for alerting.

## Review Notes
- The `* 1000` multiplier in the PromQL query assumes the latency sum metric is in seconds (Prometheus convention). Readers should verify the unit in their specific Ceph version, as some versions may export in milliseconds.
- True P99 latency percentiles cannot be computed from Ceph's default Prometheus metrics since they are exported as summaries, not histograms. For percentile-based alerting, readers would need to configure custom recording rules or use an alternative metrics pipeline.
- Ceph RGW Object Lock protects at the S3 API layer only; it does not prevent deletion via direct RADOS-level operations with Ceph admin credentials. This caveat is worth noting for high-security financial deployments.
- The `spec.network.connections.encryption.enabled` feature requires Linux kernel 5.11+ on the host nodes.
- All Rook CRD configurations (CephBlockPool, StorageClass, CephCluster, CephObjectStore) were verified against current official Rook documentation and are correct.
- S3 Object Lock COMPLIANCE mode on Ceph RGW has been independently validated for SEC Rule 17a-4(f), FINRA Rule 4511(c), and CFTC Rule 1.31(c)-(d) compliance by Cohasset Associates.
