# Validation Summary: How to Plan CPU Requirements for Ceph OSDs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (BlueStore storage engine)
- Rook (Ceph operator for Kubernetes)
- OSD (Object Storage Daemon) CPU planning
- RocksDB (BlueStore metadata backend)
- BlueStore compression (snappy, zlib, zstd)
- BlueStore encryption (AES-NI)

## Sources Consulted
- Ceph official documentation: OSD configuration reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph official documentation: BlueStore configuration (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph source code for `osd_recovery_threads` removal history
- Ceph official documentation: `ceph osd perf` command output format
- Ceph official documentation: BlueStore checksum types (`bluestore_csum_type`)
- Ceph Octopus release notes for `osd_recovery_max_active_hdd`/`osd_recovery_max_active_ssd` introduction

## Issues Found

1. **CRC32 vs CRC32c**: The post stated BlueStore uses "CRC32 checksums." BlueStore actually uses CRC32c (Castagnoli variant), which is hardware-accelerated via SSE4.2/ARM instructions. Changed "CRC32" to "CRC32c."

2. **`osd_recovery_threads` is obsolete**: The post referenced `ceph config get osd osd_recovery_threads`, which is a removed/obsolete config option in modern Ceph. Replaced with the current device-type-aware options `osd_recovery_max_active_hdd` (default: 3) and `osd_recovery_max_active_ssd` (default: 10), available since Ceph Octopus (v15.2.0).

3. **`osd_max_backfills` misleading comment**: The post stated the default was "1 (for HDDs), 4 (for SSDs recommended)", implying different defaults per device type. The actual default is 1 regardless of media type. The "4 for SSDs" was a tuning recommendation, not a default. Corrected the comment to simply state the default is 1.

4. **`ceph osd perf` misrepresented as CPU monitor**: The post used `ceph osd perf` in a "Monitor CPU Utilization" section without clarification. This command shows commit_latency_ms and apply_latency_ms (latency metrics), not CPU utilization. Added clarifying text that high latency can indicate CPU bottlenecks, and that the `top` command below is the direct CPU monitoring method.

5. **NVMe CPU breakdown didn't add up**: The 4-NVMe node recommended 48 logical CPUs but the breakdown only totaled 32 cores (16+8+4+4). Fixed by increasing recovery_burst to 16 cores (proportional to NVMe throughput), adding monitors_mgr: 4 cores (consistent with HDD example), and increasing headroom to 8 cores. New total: 48.

## Review Notes
- The CPU-per-OSD estimates in the table are reasonable approximations but will vary significantly by workload. Some sources recommend up to 10+ physical cores per NVMe OSD for heavy random I/O workloads.
- The compression overhead estimates (snappy: 0.3, zlib: 1, zstd: 0.7 cores per OSD) are rough guidelines. Actual overhead depends heavily on data compressibility and I/O throughput.
- The recovery CPU overhead estimate of ~50% is a reasonable rule of thumb but can vary widely depending on cluster size, placement group count, and recovery settings.
