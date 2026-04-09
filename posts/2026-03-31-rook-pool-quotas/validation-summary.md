# Validation Summary: How to Configure Pool Quotas (maxSize, maxObjects) in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (CRDs, StorageClasses, PVCs)
- Prometheus (alerting rules for quota monitoring)
- CSI (Container Storage Interface - RBD driver)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook pool.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/pool.yaml
- Rook API types (Go source): https://pkg.go.dev/github.com/rook/rook/pkg/apis/ceph.rook.io/v1
- Rook CSI RBD StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Red Hat Ceph Storage - Set Pool Quotas: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/
- DigitalOcean Ceph Exporter metrics: https://github.com/digitalocean/ceph_exporter/blob/main/METRICS.md
- Rook Ceph CSI Drivers documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/

## Issues Found

1. **Misleading "raw data" terminology in maxSize description**: The post described maxSize as limiting "total raw data stored in the pool (before replication overhead)." In Ceph terminology, "raw" specifically means *including* replication overhead (e.g., `ceph_pool_raw_used_bytes`). The quota actually limits *logical* data (before replication). Changed "raw data" to "logical data" and "not counting replication" to "excluding replication overhead" in both the description and the YAML comment to align with standard Ceph terminology.

2. **Incorrect Prometheus metric in alert expressions**: The alert rules used `ceph_pool_stored_raw` (which includes replication overhead) divided by `ceph_pool_quota_max_bytes` (which is a logical limit). For a 3x replicated pool at 80% logical usage, this ratio would compute to ~2.4 instead of 0.8, causing the alert to fire prematurely at ~27% actual usage. Changed to `ceph_pool_stored` which reports logical bytes stored, matching the unit of the quota limit.

## Review Notes
- The CephBlockPool CRD fields (`quotas.maxSize` as string, `quotas.maxObjects` as integer) are verified correct against the Rook API types.
- The Ceph CLI commands (`ceph osd pool get-quota`, `ceph osd pool set-quota`) use correct syntax.
- The StorageClass parameters for the rook-ceph RBD CSI driver are correct and include appropriate image features.
- The ENOSPC error behavior when a pool quota is reached is accurately described.
- Setting quota values to 0 to remove quotas is the correct approach both via CRD and CLI.
- Rook also supports a deprecated `maxBytes` (uint64) field in the quotas spec; the post correctly uses the current `maxSize` (string) field instead.
