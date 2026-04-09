# Validation Summary: How to Fix OSD_UNREACHABLE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (OSD daemons, monitors, health checks)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl, CNI, NetworkPolicy)
- Linux networking (MTU, iptables, ping, netcat, traceroute)

## Sources Consulted
- Ceph Network Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Health Checks Documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook Ceph OSD documentation for pod labels and management

## Issues Found

### 1. OSD port range too narrow (6800-6810 should be 6800-7568)
- **What was wrong:** The post referenced port range 6800-6810 in three places: the diagnostic section comment, the iptables firewall rule, and the summary paragraph. The official Ceph default port range for daemons is 6800-7568 (`ms_bind_port_min` to `ms_bind_port_max`). Using 6800-6810 in firewall rules would be too restrictive, especially on nodes running multiple OSDs or after daemon restarts where ports rebind higher.
- **What was changed:** Updated the port range to 6800-7568 in the diagnostic comment, the iptables rule (`--dport 6800:7568`), and the summary paragraph.
- **Why:** The Ceph documentation explicitly warns that daemons may bind to higher ports and recommends opening the full 6800-7568 range.

## Review Notes
- The `OSD_UNREACHABLE` health check is confirmed as a real Ceph health check code. The official documentation describes it specifically as occurring when an OSD's registered public address is outside the defined `public_network` subnet. The blog's framing as a general network connectivity issue is a reasonable practical simplification, as the troubleshooting steps apply to both subnet misconfiguration and general network isolation scenarios.
- All CLI commands (`ceph health detail`, `ceph osd find`, `systemctl`, `kubectl` with Rook labels, `nc`, `ping -M do -s 8972`, `ip link set`, `iptables`) are syntactically correct and use valid flags.
- The MTU test calculation is correct: 8972 bytes payload + 20 bytes IP header + 8 bytes ICMP header = 9000 bytes total, correctly testing a 9000 MTU.
- The Rook pod label `ceph-osd-id=5` is the correct label selector for Rook-managed OSD pods.
