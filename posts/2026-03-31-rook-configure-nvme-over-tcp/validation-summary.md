# Validation Summary: How to Configure NVMe over TCP for Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (NVMe-oF gateway / RBD)
- Rook Kubernetes operator (CephNVMeOFGateway CRD)
- NVMe over TCP (NVMe/TCP) protocol
- Linux nvme-cli tools
- Linux kernel nvme-tcp module
- TCP performance tuning (sysctl, XPS)

## Sources Consulted
- [Rook NVMe-oF Block Storage documentation](https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/)
- [Rook v1.19.0 Release Notes](https://github.com/rook/rook/releases/tag/v1.19.0)
- [Rook CRD Specification](https://www.rook.io/docs/rook/latest-release/CRDs/specification/)
- [Rook source code - types.go (CephNVMeOFGateway struct)](https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go)
- [Rook nvmeof-test.yaml example](https://github.com/rook/rook/blob/master/deploy/examples/nvmeof-test.yaml)
- [ceph-nvmeof GitHub repository (CLI source: control/cli.py)](https://github.com/ceph/ceph-nvmeof)
- [Linux Kernel Driver Database: CONFIG_NVME_TCP](https://cateee.net/lkddb/web-lkddb/NVME_TCP.html)
- [nvme-discover(1) man page](https://manpages.debian.org/testing/nvme-cli/nvme-discover.1.en.html)
- [nvme-connect(1) man page](https://manpages.debian.org/testing/nvme-cli/nvme-connect.1.en.html)
- [Linux kernel networking scaling documentation (XPS)](https://docs.kernel.org/networking/scaling.html)

## Issues Found

1. **CRD kind name was incorrect**: Changed `CephNVMEoFGateway` to `CephNVMeOFGateway`. The actual Go struct and CRD registration use `CephNVMeOFGateway` (capital M, lowercase e, capital O, capital F).

2. **CRD spec structure was fabricated**: The blog had `spec.cephCluster.name` (does not exist — gateway is namespace-scoped), `spec.gatewaySpec.serviceType` (does not exist), `spec.gatewaySpec.port` (does not exist), and `spec.gatewaySpec.instances` (wrong nesting). Replaced the entire YAML with the correct spec structure including required fields `image`, `pool`, `group`, and `instances` as top-level spec fields, matching the official example at `deploy/examples/nvmeof-test.yaml`.

3. **Ceph version requirement was wrong**: Changed "Ceph 18.x (Reef)" to "Ceph v20 (Tentacle)". The NVMe-oF gateway requires Ceph v20 or later. Rook v1.19 (which introduced NVMe-oF support) dropped Ceph v18 (Reef) entirely.

4. **Rook version requirement was wrong**: Changed "Rook v1.13+" to "Rook v1.19+". The CephNVMeOFGateway CRD was introduced in Rook v1.19.0 (released January 2026), not v1.13.

5. **CLI tool name was wrong**: Changed all instances of `nvmeof-cli` to `ceph-nvmeof`. The actual installed binary (PyPI entry point) is `ceph-nvmeof`. The name `nvmeof-cli` is a Docker service/container name, not a standalone binary.

6. **CLI subcommand was wrong**: Changed `subsystem create` to `subsystem add`. The `create` action does not exist in the ceph-nvmeof CLI; the correct action is `add`.

7. **CLI flag was wrong**: Changed all instances of `--subsystem-nqn` to `--subsystem`. The flag `--subsystem-nqn` does not exist; the correct flag is `--subsystem` (short form: `-n`).

8. **Misleading performance tuning comment**: Changed "# Disable TCP Nagle for lower latency" to "# Configure XPS transmit queue CPU affinity for better throughput". The command `echo 1 > /sys/class/net/eth0/queues/tx-0/xps_cpus` configures Transmit Packet Steering (XPS) CPU affinity, not Nagle's algorithm. Nagle is controlled per-socket via TCP_NODELAY and the kernel nvme-tcp module handles this automatically.

## Review Notes
- The NVMe-oF gateway feature is marked as **experimental** in Rook v1.19 release notes. Users should be aware of this status.
- The NQN format `nqn.2024-01.io.ceph:nvmeof-subsystem-1` used in the post is a valid NQN, though official Ceph examples typically use `nqn.2016-06.io.spdk:cnode1`. Both are acceptable.
- The `nvme discover` and `nvme connect` commands, flags, port 4420, kernel module name, and kernel version requirement (5.0+) are all correct.
- The TCP buffer tuning values (64 MB) are reasonable and standard for high-throughput NVMe/TCP workloads on 10 GbE+ networks.
- The XPS command (`echo 1 > .../xps_cpus`) sets CPU affinity to CPU 0 only, which is a simplified example. In production, users should configure the bitmask based on their actual CPU topology.
