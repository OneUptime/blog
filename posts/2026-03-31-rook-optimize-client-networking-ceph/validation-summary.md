# Validation Summary: How to Optimize Client Networking for Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph orchestrator for Kubernetes)
- Linux kernel networking (sysctl, TCP tuning)
- ethtool / NIC queue configuration
- RDMA (RoCE / InfiniBand)
- NetworkManager / nmcli
- iperf3, sar, ss (monitoring tools)

## Sources Consulted
- Ceph Messaging Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/ms-ref/
- Ceph Network Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph source code `src/common/options/global.yaml.in` (main branch) for config option definitions
- Ceph source code `src/msg/async/rdma/` for RDMA messenger status
- Red Hat Ceph Storage documentation (RDMA support status)
- Linux kernel documentation for sysctl network parameters
- Rook GitHub issue #13911 (RDMA/RoCEv2 support in Rook)

## Issues Found

### 1. RDMA section missing experimental status caveat
- **What was wrong:** The post recommended `ms_type = async+rdma` without mentioning that RDMA transport has always been experimental in Ceph and is not production-supported by any major vendor (Red Hat, SUSE). It also requires a Ceph build compiled with `HAVE_RDMA`.
- **What was changed:** Added a note clarifying the experimental status, lack of vendor production support, and the build requirement.
- **Why:** Readers following this advice for production workloads need to understand the support limitations and build prerequisites.

### 2. Persistent MTU configuration used deprecated ifcfg-scripts
- **What was wrong:** The post showed persisting MTU via `/etc/sysconfig/network-scripts/ifcfg-eth1`, which is RHEL/CentOS-specific and has been removed in RHEL 9+ and Fedora 33+. A 2026 blog post should not recommend a deprecated method.
- **What was changed:** Replaced the ifcfg-scripts approach with `nmcli connection modify` commands, which work on modern RHEL 8+, Ubuntu 18.04+, and other distributions using NetworkManager.
- **Why:** The legacy network-scripts package is no longer available on current Linux distributions. NetworkManager via `nmcli` is the standard approach.

## Review Notes
- `ms_tcp_nodelay = true` is already the Ceph default value. Explicitly setting it is not wrong (it ensures the expected behavior), but readers should know this is confirming a default rather than changing a setting.
- `ms_async_op_threads = 3` is also the current Ceph default. Same note applies.
- The `ms_dispatch_throttle_bytes` value in the post (1 GB) is 10x the Ceph default (100 MB). This is a valid tuning choice for high-throughput workloads but readers should understand this is a significant increase.
- The socket buffer values (128 MB max) are aggressive but appropriate for dedicated storage networks with 10 GbE+ links. On systems with limited memory, these should be scaled down.
- The `ethtool -L eth1 combined 8` command sets combined RX+TX queues, not just receive queues as the section title suggests. The command is correct; the description is slightly imprecise.
- Rook does not currently support configuring RDMA per-node (see rook/rook#13911), so the RDMA section is primarily applicable to bare-metal or non-Rook Ceph deployments despite the blog's Rook tag.
