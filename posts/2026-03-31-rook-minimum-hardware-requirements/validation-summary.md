# Validation Summary: How to Calculate Minimum Hardware Requirements for Ceph

## Status
validated

## Post Type
Guide / Capacity Planning Reference

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph OSDs (Object Storage Daemons)
- Ceph Monitors (MON)
- Ceph Managers (MGR)
- BlueStore (Ceph storage backend)
- NVMe and HDD storage devices
- Network planning (10 GbE, 25 GbE, 100 GbE)

## Sources Consulted
- Ceph official hardware recommendations: https://docs.ceph.com/en/latest/start/hardware-recommendations/
- Ceph source documentation on hardware recommendations: https://github.com/ceph/ceph/blob/main/doc/start/hardware-recommendations.rst
- Ceph OSD CPU scaling blog post: https://ceph.io/en/news/blog/2022/ceph-osd-cpu-scaling/
- Red Hat Ceph Storage Hardware Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/hardware_guide/minimum-hardware-recommendations_hw
- Ceph default configuration values for `osd_memory_target`, `mon_osd_nearfull_ratio`, `mon_osd_full_ratio`

## Issues Found
1. **NVMe CPU requirement understated** (line 37): The post claimed "2 cores per OSD (NVMe)" but official Ceph documentation recommends 4+ cores per NVMe OSD, with some workloads requiring up to 10+ cores. Changed "2 cores per OSD (NVMe)" to "4+ cores per OSD (NVMe)".

## Review Notes
- The network bandwidth calculation "For 3x replication: 3 x 2.4 = 7.2 GB/s cluster write bandwidth" is a simplification. With 3x replication, the cluster/replication network carries 2 additional copies (primary to secondaries), so the per-node cluster network demand is closer to 2x the write rate (~4.8 GB/s), not 3x. The conclusion that 25 GbE is insufficient remains valid either way, so this is a minor presentation issue rather than a material error.
- The OSD memory recommendation of "5-8 GB per OSD (recommended)" is slightly above the official default `osd_memory_target` of 4 GiB, but is acceptable as a production recommendation with headroom for metadata-heavy workloads.
- Monitor RAM minimum of 4 GB is on the low side — official docs suggest 5+ GB per daemon for production clusters — but is acceptable for small clusters as described.
- All bash arithmetic and capacity planning calculations are mathematically correct.
- The 80% utilization target aligns with Ceph best practices (default nearfull ratio is 85%).
- The 200 MB/s per HDD figure is a reasonable planning estimate for modern 7200 RPM enterprise drives.
