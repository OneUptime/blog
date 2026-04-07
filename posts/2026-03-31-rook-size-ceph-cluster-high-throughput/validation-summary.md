# Validation Summary: How to Size a Ceph Cluster for High-Throughput Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (BlueStore OSDs, CephFS, RADOS)
- Erasure Coding (EC pools)
- Kubernetes (ConfigMap, kubectl)
- fio (flexible I/O tester)
- rados bench (Ceph native benchmarking)

## Sources Consulted
- Ceph documentation on OSD configuration options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephCluster network configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#network-configuration-settings
- Ceph rados bench command reference: https://docs.ceph.com/en/latest/man/8/rados/
- fio documentation: https://fio.readthedocs.io/en/latest/

## Issues Found
1. **`rados bench` flags incorrect** (line 142): The command used `--block-size=4M --num-objects=1000`. The `--num-objects` flag does not exist for `rados bench`; the correct flag is `--max-objects`. Additionally, changed `--block-size` to the standard short form `-b` for consistency with Ceph documentation. Fixed to: `-b 4M --max-objects=1000`.

## Review Notes
- The OSD sizing math is correct. The replication amplification factor of 3x is properly applied, and the NVMe calculation is consistent.
- The RAM recommendation of 8GB per OSD is higher than the Ceph-documented minimum of ~5GB per OSD for BlueStore, but is reasonable for high-throughput workloads where larger BlueStore caches improve performance.
- The `osd_max_write_size = 90` in the OSD tuning ConfigMap is actually the default value (90 MB). It is not wrong to include it explicitly, but users should be aware it does not change behavior unless the default has been modified elsewhere.
- The Rook network selector configuration shown uses the Multus-based format. Users should ensure Multus CNI is installed and configured for this to work.
- The erasure coded CephBlockPool correctly uses the `bulk` parameter flag (available since Ceph Pacific) which hints to Ceph that the pool will store large amounts of data, enabling optimized PG splitting.
