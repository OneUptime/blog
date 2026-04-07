# Validation Summary: How to Monitor TCP Statistics and RTT for Ceph Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- `ss` (socket statistics utility)
- `ping` (ICMP round-trip measurement)
- `/proc/net/snmp` and `/proc/net/dev` (Linux kernel network statistics)
- Kubernetes (`kubectl exec`, ConfigMaps)
- TCP networking (RTT, retransmits, congestion window)

## Sources Consulted
- Ceph documentation on messenger v1/v2 configuration options (ms_tcp_nodelay, ms_tcp_rcvbuf, ms_initial_backoff, ms_max_backoff): https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Rook documentation on rook-config-override ConfigMap: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Linux `ss` man page for `-tnip` flags and internal TCP info output format
- Linux `/proc/net/dev` and `/proc/net/snmp` kernel documentation
- Ceph documentation on replication and min_size behavior: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found
No technical issues found.

## Review Notes
- The `ss -tnip` output sample is realistic and accurately represents what the command produces, including valid fields like `rtt`, `retrans`, `cwnd`, `mss`, `pmtu`, `pacing_rate`, and `delivery_rate`.
- Port 6800 (OSD messenger v1) and 3300 (monitor messenger v2) are correctly used in the sample output.
- The Rook label selectors (`ceph_daemon_type=osd`, `app=rook-ceph-osd`) are both valid for selecting OSD pods in a Rook-managed cluster.
- The `/proc/net/dev` awk parsing correctly references field `$2` for RX bytes and `$10` for TX bytes, matching the kernel's output format.
- The RTT threshold guidance (<1ms LAN, >5ms noticeable, >20ms significant) aligns with community recommendations for Ceph network requirements.
- The `ms_tcp_rcvbuf = 0` setting correctly means "use OS default" rather than disabling the receive buffer.
