# Validation Summary: How to Monitor NFS Performance in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (NFS orchestration on Kubernetes)
- NFS-Ganesha (NFS server daemon)
- CephFS MDS (Metadata Server)
- Prometheus / Prometheus Operator (metrics collection)
- Grafana (dashboards)
- Kubernetes (ServiceMonitor, kubectl)

## Sources Consulted
- NFS-Ganesha Monitoring Sub System Wiki: https://github.com/nfs-ganesha/nfs-ganesha/wiki/Monitoring-Sub-System
- NFS-Ganesha Core Config manpage: https://manpages.debian.org/testing/nfs-ganesha/ganesha-core-config.8.en.html
- NFS-Ganesha Cache Config manpage: https://manpages.debian.org/experimental/nfs-ganesha/ganesha-cache-config.8.en.html
- NFS-Ganesha D-Bus Interface Wiki: https://github.com/nfs-ganesha/nfs-ganesha/wiki/Dbusinterface
- Gandi ganesha_exporter: https://github.com/Gandi/ganesha_exporter
- Ceph Performance Counters documentation: https://docs.ceph.com/en/latest/dev/perf_counters/
- Ceph man page (mds subcommands): https://manpages.debian.org/testing/ceph-common/ceph.8.en.html
- Ceph MGR Prometheus module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook Ceph Monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- NFS-Ganesha ganeshactl scripts source: https://github.com/nfs-ganesha/nfs-ganesha/tree/next/src/scripts/ganeshactl

## Issues Found

### 1. Fabricated MONITORING config block (critical)
**What was wrong:** The post showed a `MONITORING { Prometheus { Enable = true; Port = 9587; } }` configuration block that does not exist in NFS-Ganesha. This config syntax is entirely fabricated.
**What was changed:** Replaced with the correct `NFS_CORE_PARAM` parameters: `Enable_Metrics = true;`, `Enable_Dynamic_Metrics = true;`, and `Monitoring_Port = 9587;`.
**Why:** NFS-Ganesha enables its built-in Prometheus exporter via parameters within `NFS_CORE_PARAM`, not a separate `MONITORING` block.

### 2. All six Prometheus metric names were fabricated (critical)
**What was wrong:** The metrics `ganesha_nfs_v4_total_ops`, `ganesha_nfs_v4_read_bytes`, `ganesha_nfs_v4_write_bytes`, `ganesha_nfs_v4_op_latency_seconds`, `ganesha_cache_inode_hit_count`, and `ganesha_cache_inode_miss_count` do not exist in any known NFS-Ganesha exporter.
**What was changed:** Replaced with real metric names from the NFS-Ganesha native Prometheus exporter: `nfs_requests_total`, `nfs_bytes_received_total`, `nfs_bytes_sent_total`, `nfs_latency_ms`, `nfs_mdcache_hits_total`, `nfs_mdcache_misses_total`.
**Why:** Real NFS-Ganesha metrics use the `nfs_` prefix, not `ganesha_nfs_v4_` or `ganesha_cache_inode_`.

### 3. Deprecated CACHE_INODE config block name
**What was wrong:** The post referenced the `CACHE_INODE` config block, which is deprecated.
**What was changed:** Replaced with `MDCACHE`, the current config block name.
**Why:** `CACHE_INODE` was renamed to `MDCACHE` in NFS-Ganesha v3+. While the old name may still be accepted, the current name should be used.

### 4. Invalid `ceph mds perf dump` command
**What was wrong:** `ceph mds perf dump` is not a valid Ceph CLI command. The `ceph mds` subcommand tree does not include `perf dump`.
**What was changed:** Replaced with `ceph tell mds.<id> perf dump`, which is the correct remote command for dumping MDS performance counters. Added note about replacing `<id>` with the actual daemon name.
**Why:** `ceph tell` is the correct mechanism for sending perf dump commands to a specific MDS daemon from a remote host (like the Rook toolbox pod).

### 5. Non-existent `request_lat` MDS perf counter
**What was wrong:** The post told readers to watch for `request_lat` values, which is not a real MDS perf counter name.
**What was changed:** Replaced with references to actual per-operation latency counters (`req_lookup`, `req_create`, `req_getattr` with `.lat` sub-fields).
**Why:** MDS perf counters are organized per-operation, each with a `.lat` latency sub-field, not as a single `request_lat` value.

### 6. Wrong NFS-Ganesha stats command
**What was wrong:** `ganesha_mgr get_stats` is incorrect. `ganesha_mgr` is a real tool but is for managing exports/clients, not statistics. `get_stats` is not a valid subcommand.
**What was changed:** Replaced with `ganesha_stats v4_full`, the correct tool and subcommand for viewing NFSv4 statistics. Added note about other useful subcommands.
**Why:** `ganesha_stats` is the dedicated NFS-Ganesha statistics tool; `ganesha_mgr` handles export and client management.

### 7. Summary section repeated fabricated config block name
**What was wrong:** The summary referenced the non-existent `MONITORING` config block.
**What was changed:** Updated to reference `Enable_Metrics` in the `NFS_CORE_PARAM` config block.
**Why:** Consistency with the corrected configuration section.

## Review Notes
- The built-in NFS-Ganesha Prometheus exporter is a relatively recent addition (v5+, merged into the `next` branch). Older versions of NFS-Ganesha bundled with Ceph may not include this feature and would require a third-party exporter like Gandi's ganesha_exporter or D-Bus-based monitoring.
- The ServiceMonitor configuration and Service port snippets are structurally correct for the Prometheus Operator pattern, though the actual label selectors may vary depending on the Rook version.
- The Grafana dashboard section is general advice and is reasonable, though no specific dashboard ID is provided.
