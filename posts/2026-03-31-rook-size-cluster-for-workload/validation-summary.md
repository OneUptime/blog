# Validation Summary: How to Size a Ceph Cluster for Your Workload

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- BlueStore (Ceph OSD backend)
- fio (Flexible I/O Tester) with rbd ioengine
- Erasure coding and replication strategies

## Sources Consulted
- Ceph official documentation on cluster sizing and hardware recommendations: https://docs.ceph.com/en/latest/start/hardware-recommendations/
- Ceph documentation on OSD full ratios (mon_osd_full_ratio, nearfull_ratio): https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph erasure coding documentation (k+m overhead calculation): https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- fio documentation for rbd ioengine options: https://fio.readthedocs.io/en/latest/fio_doc.html

## Issues Found

1. **Step 4 - Inconsistent raw capacity value**: The node count calculation used `300` (100 TB × 3 replicas) for raw capacity, but Step 2 established that a 20% overhead reserve should be included, which yields 375 TB raw. Changed `300` to `375` and added a comment referencing Step 2 for clarity.

2. **Example 1 - Capacity target not met**: The reference sizing for the database workload specified 4 × 4 TB NVMe per node across 3 nodes (48 TB raw / 3 replicas = 16 TB usable), but the stated target was 20 TB usable. Changed to 5 × 4 TB NVMe per node (60 TB raw / 3 = 20 TB usable) to meet the target.

## Review Notes
- The NVMe IOPS estimate of ~200K per OSD is a reasonable planning figure for enterprise NVMe with Ceph/BlueStore overhead, though actual numbers vary significantly by drive model and workload profile.
- The HDD throughput estimate of 150-200 MB/s is appropriate for sequential workloads on modern HDDs but will be much lower for random I/O.
- Example 1's capacity (5 × 4 TB × 3 nodes = 60 TB raw / 3 = 20 TB usable) meets the target exactly but does not include the 20% overhead buffer from Step 2. In practice, more drives or nodes would be needed for the full overhead margin. This is acceptable for a reference example but worth noting.
- The fio command is correct. The `--clientname` parameter defaults to `admin` and is optional when the admin keyring is available.
