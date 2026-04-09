# Validation Summary: How to Handle Network Partitions in Ceph

## Status
validated

## Post Type
Troubleshooting Guide / Operations Runbook

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- Kubernetes
- systemctl / journalctl (Linux service management)
- CRUSH map and MON/OSD architecture

## Sources Consulted
- Ceph Mon-OSD Interaction Documentation: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/
- Ceph Architecture Documentation: https://docs.ceph.com/en/reef/architecture/
- Ceph Troubleshooting Monitors: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Ceph Troubleshooting OSDs: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-osd/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/

## Issues Found

### 1. Incorrect comment for `mon_osd_downout_subtree_limit` setting
- **What was wrong:** The comment said "Increase OSD down detection time" but `mon_osd_downout_subtree_limit` controls which CRUSH subtree level prevents automatic OSD mark-out (e.g., if an entire rack goes down, don't auto-mark those OSDs out). It has nothing to do with detection time.
- **What was changed:** Replaced the comment with an accurate description of the setting's purpose.

### 2. OSD heartbeat tuning values were set to defaults
- **What was wrong:** `osd_heartbeat_grace` was set to 20 and `osd_heartbeat_interval` was set to 6, which are already the default values. The section claimed these would make Ceph "more tolerant of high-latency links," but setting defaults changes nothing.
- **What was changed:** Increased values to `osd_heartbeat_grace 40` and `osd_heartbeat_interval 10` to actually provide more tolerance for flaky networks. Added a comment noting the default values for reference.

### 3. Incorrect claim that MON quorum loss makes the cluster "read-only"
- **What was wrong:** The summary stated "losing the majority of MONs makes the cluster read-only." This is incorrect. When MON quorum is lost, existing clients with cached OSD maps can still perform both reads and writes to OSDs. The actual impact is that no administrative operations, new client authentication, or OSD map updates can proceed, making the cluster effectively unavailable rather than read-only.
- **What was changed:** Replaced "makes the cluster read-only" with an accurate description of the impact: prevents administrative operations, new client authentication, and OSD map updates, making the cluster effectively unavailable.

## Review Notes
- The `mon_osd_down_out_interval` default of 600 seconds (10 minutes) is correctly stated.
- All `ceph` CLI commands are syntactically correct and use valid subcommands.
- The `noout` and `norebalance` flag usage is correct and follows best practices for planned maintenance.
- The Rook/Kubernetes section uses correct namespace (`rook-ceph`) and label selectors (`app=rook-ceph-osd`).
- The maintenance script's trap/background-sleep pattern is a valid bash approach for interruptible timeouts.
- The post correctly recommends odd numbers of MONs placed across fault domains for partition resilience.
