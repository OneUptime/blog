# Validation Summary: How to Troubleshoot Network Packet Loss in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (OSD heartbeat configuration, cluster/public network settings)
- Linux networking tools (ping, mtr, traceroute, ip, ethtool, ss, netstat)
- iperf3 (network throughput and packet loss testing)
- Rook (Ceph on Kubernetes context)

## Sources Consulted
- Ceph official documentation: OSD configuration reference for `osd_heartbeat_grace` (default 20s) and `osd_heartbeat_min_peers` (default 10) — https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation: Network configuration reference for `cluster_network` and `public_network` — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Linux man pages for `ping`, `mtr`, `ethtool`, `ip`, `ss`, `netstat`
- iperf3 documentation for UDP packet loss testing flags (`-u`, `-b`, `-t`)

## Issues Found
- **`osd_heartbeat_grace` set to default value**: The post used `ceph config set osd osd_heartbeat_grace 20`, but 20 seconds is already the default value. The accompanying comment said "Require more missed heartbeats before marking OSD down," which implies increasing tolerance beyond normal, but the value shown would have no effect on a default-configured cluster. Changed to `40` to actually demonstrate increasing the grace period for packet-loss-prone environments.

## Review Notes
- The `osd_heartbeat_min_peers 3` setting reduces the minimum peers from the default of 10. While this is a valid tuning for small clusters, it's not directly about tolerating packet loss — it reduces heartbeat traffic. The framing is acceptable but could be more precise in a future revision.
- The `ping -M do -s 8972` command correctly calculates the maximum payload for 9000 MTU (9000 - 20 IP header - 8 ICMP header = 8972).
- The mtr output code block uses `yaml` as the language tag, which is unconventional but does not affect correctness.
- All other commands (`ip -s link show`, `ethtool -S`, `iperf3`, `ceph config set`, `ss -s`, `netstat -s`) are syntactically correct with valid flags.
