# Validation Summary: How to Handle OSD Flapping Caused by MTU Misconfiguration

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD, monitors, heartbeat subsystem)
- Linux networking (ip link, ping, tracepath, NetworkManager/nmcli)
- Kubernetes (kubectl exec into rook-ceph-tools)

## Sources Consulted
- Ceph official documentation on OSD configuration options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph documentation on messenger v2 and network configuration: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph documentation on ms_dispatch_throttle_bytes, ms_initial_backoff, ms_max_backoff messenger options: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Linux man pages for ping(8), ip-link(8), tracepath(8), nmcli(1)
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

### Issue 1: Incorrect Ceph config options described for MTU workaround
- **What was wrong:** The section "Configuring Ceph Network MTU" claimed you could "reduce Ceph's message size to match the actual MTU" by setting `ms_dispatch_throttle_bytes` and `ms_initial_backoff`, but these messenger options control dispatch throttling and connection backoff timing, not packet or message size. The accompanying command set `ms_max_backoff` (yet another backoff timing option), which also does not control message size. None of these three options are relevant to MTU-related tuning.
- **What was changed:** Removed the incorrect paragraph and the `ms_max_backoff` command. Reframed the section as "Configuring Ceph Heartbeat Tolerance" — the correct workaround when you cannot fix MTU is to increase the heartbeat grace period so that occasional missed heartbeats don't trigger OSD down marking. The heartbeat interval and grace commands that followed were already correct and now serve as the primary content of this section.
- **Why:** The original text would mislead readers into setting irrelevant Ceph messenger options that have no effect on MTU-related packet drops.

### Issue 2: Misleading framing of heartbeat tuning
- **What was wrong:** The text said "configure Ceph to avoid large heartbeat packets by tuning the heartbeat interval" — but `osd_heartbeat_interval` and `osd_heartbeat_grace` control timing (how often heartbeats are sent and how long to wait before marking down), not packet size. Changing these values does not make heartbeat packets smaller.
- **What was changed:** The misleading introductory sentence was removed as part of the section rewrite. The commands themselves were kept as-is since they are valid and useful for tolerating transient heartbeat loss.
- **Why:** The framing suggested these settings reduce packet size, which is incorrect. They increase tolerance to missed heartbeats, which is the actual mechanism that helps with MTU issues.

## Review Notes
- The default values for `osd_heartbeat_interval` (6 seconds) and `osd_heartbeat_grace` (20 seconds) are not mentioned in the post. The suggested values of 10 and 40 are reasonable doublings of the defaults, but mentioning the defaults would help readers understand the magnitude of the change.
- The post correctly explains the MTU - 28 byte calculation for ping payload size and the use of `-M do` to prohibit fragmentation.
- All kubectl commands correctly target the `rook-ceph` namespace and use the `rook-ceph-tools` deployment, which is the standard Rook toolbox.
- The `nmcli` commands use the correct property path `802-3-ethernet.mtu` for setting MTU persistently.
