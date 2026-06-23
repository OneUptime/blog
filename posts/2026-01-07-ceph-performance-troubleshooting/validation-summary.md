# Validation Summary: How to Troubleshoot Ceph Performance Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ceph
- RADOS
- RBD
- CephFS
- Ceph OSD, MON, MGR, and RGW components
- BlueStore
- Linux networking and disk I/O diagnostics
- Prometheus metrics
- fio, iperf3, iostat, smartctl, sar, perf, and jq

## Sources Consulted
- Ceph Documentation: Monitoring OSDs and PGs - https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Documentation: Monitoring a Cluster - https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph Documentation: Control Commands - https://docs.ceph.com/en/reef/rados/operations/control/
- Ceph Documentation: OSD Config Reference - https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Documentation: BlueStore Configuration Reference - https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph Documentation: Placement Groups and PG autoscaling - https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph Documentation: rados man page - https://docs.ceph.com/en/latest/man/8/rados/
- Ceph Documentation: Prometheus Module - https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Documentation: Troubleshooting PGs - https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-pg
- Red Hat Ceph Storage Documentation: mClock OSD scheduler - https://docs.redhat.com/en/documentation/red_hat_ceph_storage/8/html/administration_guide/the-mclock-osd-scheduler

## Issues Found
- The architecture diagram incorrectly implied that monitors sit in the read/write data path between RGW/RBD/CephFS and OSDs. Updated the diagram so access services connect to monitors for cluster maps and to OSDs for data I/O.
- The PG hotspot example sorted `ceph pg dump pgs_brief` table output as if it contained operation counts. Replaced it with a JSON-based `ceph pg dump pgs` command that identifies PGs with high object counts.
- The slow-operation command comments described `ceph daemon osd.0 ops` as listing all OSDs and hard-coded a default threshold. Corrected the text to describe a single OSD and the configured slow-operation threshold.
- The network tuning section presented sysctl values as generally recommended Ceph tuning. Reworded it as workload-specific example tuning to validate before use.
- The BlueStore cache tuning section did not account for default cache autotuning via `osd_memory_target`. Added a caveat and corrected the memory minimum example to use `osd_memory_cache_min`.
- The OSD thread and recovery tuning section did not mention device-class-specific options or mClock behavior. Added the SSD-specific config checks and noted that legacy recovery/backfill limits may be ignored under mClock.
- The PG sizing formula double-counted replication by mentioning both pool size and replication factor. Corrected the wording to the standard replicated-pool estimate and removed the manual `pgp_num` step for modern Ceph, where `pgp_num` is adjusted automatically.
- The monitor RocksDB example recommended setting `mon_rocksdb_options` directly. Replaced it with guidance to avoid changing monitor RocksDB options unless directed by Ceph documentation or support.
- The RADOS benchmark cleanup command lacked the benchmark prefix. Updated it to `rados -p <pool-name> cleanup --prefix benchmark_data`.
- The PG repair example described `ceph pg repair` as forcing recovery. Corrected it to describe repair of inconsistent PGs after checking health details and scrub output.
- The `reweight-by-utilization` comment did not explain the positional arguments accurately. Updated it to identify threshold, max weight change, and optional max OSD count.

## Review Notes
The post is technically relevant and useful after correction. Several tuning values remain examples rather than universal recommendations; future revisions could make the guide stronger by adding version-specific notes for Quincy/Reef/Squid and by separating legacy WPQ tuning from mClock tuning.
