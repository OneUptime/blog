# Validation Summary: How to Use the ceph daemon Command for Admin Socket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (admin socket / `ceph daemon` command)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (`kubectl exec`)
- Ceph OSD, Monitor, and MDS daemons
- Ceph performance counters and runtime configuration

## Sources Consulted
- Ceph official documentation: General Config Reference (https://docs.ceph.com/en/latest/rados/configuration/general-config-ref/)
- Ceph man page for `ceph` command (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph Configuration docs (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/)
- Ceph Perf Counters documentation (https://docs.ceph.com/en/reef/dev/perf_counters/)
- Ceph OSD Config Reference (https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/)
- Ceph Troubleshooting Monitors (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/)
- CephFS Troubleshooting docs (https://docs.ceph.com/en/quincy/cephfs/troubleshooting/)
- Rook documentation and quickstart guides (https://rook.io/docs/rook/latest/Getting-Started/quickstart/)
- Rook GitHub issue #3966 (admin socket path in containers)

## Issues Found

1. **Incorrect description of `mon_status` command** (line 79): The inline comment described `ceph daemon mon.a mon_status` as "Dump the monitor's recent operations log." This is incorrect — `mon_status` returns the monitor's status information including election epoch, quorum membership, quorum leader, monmap, and the monitor's state (leader/peon/probing/etc.). Changed the comment to "Get the monitor's status including quorum and monmap information."

2. **Incorrect MDS daemon name for Rook environments** (lines 86-89): The post used `mds.0` as the MDS daemon name. In Rook deployments, MDS daemons are named after the CephFS filesystem they serve, following the pattern `mds.<filesystem-name>-<suffix>` (e.g., `mds.myfs-a`). Changed `mds.0` to `mds.myfs-a` and added a comment showing how to discover the actual daemon name by listing the socket files.

## Review Notes
- The `osd_recovery_max_active` option defaults to 0 in modern Ceph (Pacific+), which means the device-specific variants (`osd_recovery_max_active_hdd`, `osd_recovery_max_active_ssd`) take effect instead. The blog's example of setting it to 1 will work but overrides the device-specific behavior.
- In Ceph Reef and later, the mClock scheduler is the default OSD scheduler, and it manages recovery QoS automatically. The `osd_recovery_max_active` and `osd_recovery_sleep` options are ignored when mClock is active. This could be worth noting in a future update.
- All other commands, syntax, socket paths, pod labels, and technical explanations were verified as correct.
