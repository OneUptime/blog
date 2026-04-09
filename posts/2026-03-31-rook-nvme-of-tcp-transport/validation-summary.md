# Validation Summary: How to Set Up NVMe-oF TCP Transport for Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NVMe over Fabrics (NVMe-oF) with TCP transport
- Rook Ceph Operator (CephNVMeOFGateway CRD)
- Ceph NVMe-oF Gateway CLI
- Linux nvme-cli (discover, connect, list-subsys)
- Linux kernel NVMe/TCP module (nvme-tcp)
- fio benchmarking tool
- Linux sysctl network tuning

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel NVMe/TCP host driver source: https://github.com/torvalds/linux/blob/master/drivers/nvme/host/tcp.c
- Linux kernel NVMe/TCP target driver source: https://github.com/torvalds/linux/blob/master/drivers/nvme/target/tcp.c
- Rook NVMe-oF CRD types (Go struct definitions): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook NVMe-oF Block Storage documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Ceph NVMe-oF target configuration documentation: https://docs.ceph.com/en/latest/rbd/nvmeof-target-configure/
- ceph-nvmeof CLI source (cli.py): https://github.com/ceph/ceph-nvmeof/blob/main/control/cli.py
- tcp(7) man page for TCP_NODELAY socket option: https://man7.org/linux/man-pages/man7/tcp.7.html

## Issues Found

### 1. Invalid sysctl: `net.ipv4.tcp_nodelay=1`
**What was wrong:** The post recommended `sysctl -w net.ipv4.tcp_nodelay=1` to disable Nagle's algorithm. `net.ipv4.tcp_nodelay` does not exist as a Linux sysctl parameter — TCP_NODELAY is a per-socket option only (set via `setsockopt()`). Running this command would produce an error. Furthermore, the Linux NVMe/TCP kernel module already calls `tcp_sock_set_nodelay()` on its sockets automatically.
**What was changed:** Replaced with valid socket buffer size tuning (`net.core.rmem_max`, `net.core.wmem_max`, `net.ipv4.tcp_rmem`, `net.ipv4.tcp_wmem`) which are legitimate and beneficial sysctls for NVMe/TCP throughput.

### 2. Irrelevant sysctl: `net.ipv4.tcp_fastopen=3`
**What was wrong:** While `net.ipv4.tcp_fastopen` is a valid sysctl, TCP Fast Open optimizes connection establishment by allowing data in the SYN packet. NVMe/TCP uses long-lived persistent connections, making TFO irrelevant — the one-time RTT saving on initial connect is negligible. The kernel NVMe/TCP driver does not reference tcp_fastopen at all.
**What was changed:** Replaced with TCP memory tuning parameters (`tcp_rmem`, `tcp_wmem`) that actually improve NVMe/TCP performance.

### 3. Incorrect CRD Kind and spec structure
**What was wrong:** The CephNVMeoFGateway resource had multiple errors:
- Kind was `CephNVMeoFGateway` (lowercase "oF") instead of `CephNVMeOFGateway` (uppercase "OF")
- Used `spec.server.active: 2` which does not exist; the correct field is `spec.instances: 2`
- Used `spec.pool.name: nvmeof-pool` (nested object) instead of `spec.pool: nvmeof-pool` (flat string)
- Missing required `image` and `group` fields
**What was changed:** Corrected the Kind name, replaced `spec.server.active` with `spec.instances`, flattened `spec.pool`, and added required `image` and `group` fields.

### 4. Incorrect CLI command for adding a listener
**What was wrong:** Used `ceph nvmeof gateway add_listener` with `--nqn` flag. The correct command is `ceph nvmeof listener add` with `--subsystem` flag. The `--trtype TCP` and `--adrfam IPv4` flags are not standard parameters (TCP and IPv4 are defaults).
**What was changed:** Corrected to `ceph nvmeof listener add` with `--subsystem` flag and removed non-standard `--trtype` and `--adrfam` flags.

### 5. Summary mentioned invalid tuning parameter
**What was wrong:** Summary referenced "tcp_nodelay" as a tuning parameter.
**What was changed:** Updated to "socket buffers, connection backlog" to match the corrected tuning section.

## Review Notes
- The kernel version requirement (5.0+) is correct — the nvme-tcp module was introduced in Linux 5.0.
- The Ceph Reef (18.x) requirement is correct for NVMe-oF gateway support.
- The NVMe/TCP default port 4420 is correct (IANA-assigned).
- The NQN format `nqn.2024-01.io.ceph:my-subsystem` follows the correct NVMe specification pattern.
- The nvme-cli commands for discover/connect/list are correct with proper flags.
- The fio benchmark commands use valid parameters and reasonable settings for NVMe testing.
- The multi-path approach (connecting same NQN via different gateway IPs) and ANA groups reference are correct.
- The `image` field in the CRD was set to `quay.io/ceph/nvmeof:1.5` — users should verify the latest available image tag for their deployment.
