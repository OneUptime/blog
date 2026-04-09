# Validation Summary: How to Configure NVMe-oF for Maximum Throughput in Ceph

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Rook Ceph Operator
- Ceph NVMe-oF Gateway (NVMe over Fabrics)
- fio (Flexible I/O Tester)
- Linux NVMe CLI (`nvme-cli`)
- Linux kernel TCP tuning (`sysctl`)
- Ceph OSD mClock scheduler
- Ceph BlueStore

## Sources Consulted
- NVM Express Base Specification (Feature ID 0x07 — Number of Queues)
- Linux kernel source and changelog (removal of `tcp_low_latency` in kernel 4.14, commit `0ea488f` by Eric Dumazet)
- Ceph documentation for mClock QoS scheduler parameter naming (Quincy+ naming convention: `osd_mclock_scheduler_*`)
- Rook Ceph source code (`pkg/apis/ceph.rook.io/v1/types.go`) for CephNVMeOFGateway CRD definition
- Linux `nvme-cli` documentation for `set-feature` and `connect` commands
- Linux sysfs block device queue parameters (`/sys/block/*/queue/nr_requests`)

## Issues Found

### 1. NVMe Feature ID 7 misidentified as queue depth (Critical)
**What was wrong:** The post used `nvme set-feature /dev/nvme0n1 -f 7 -v 256` claiming it sets "I/O queue depth." NVMe Feature ID 7 (`NVME_FEAT_NUM_QUEUES`) actually controls the *number of I/O queues* allocated to the host, not the depth (outstanding commands) per queue.
**What was changed:** Replaced with the correct approach: writing to `/sys/block/nvme0n1/queue/nr_requests` for existing devices and using `--queue-size=256` with `nvme connect` for new NVMe-oF connections.

### 2. `net.ipv4.tcp_low_latency` sysctl removed from Linux kernel (Critical)
**What was wrong:** The post set `net.ipv4.tcp_low_latency=1` with the comment "Disable Nagle algorithm for latency." This is doubly incorrect: (a) the sysctl was removed from the Linux kernel in version 4.14 (November 2017) and will error on any modern kernel, and (b) it never disabled the Nagle algorithm — that is controlled per-socket via `TCP_NODELAY`. The sysctl was a hint for latency-vs-throughput TCP receive path processing.
**What was changed:** Removed the `tcp_low_latency` lines entirely.

### 3. Deprecated Ceph mClock parameter name (Moderate)
**What was wrong:** The post used `osd_op_queue_mclock_client_write_res`, which is a defunct parameter name from the old mClock implementation. In modern Ceph (Quincy+), the mClock scheduler parameters use the `osd_mclock_scheduler_*` naming convention and do not split by read/write operation type.
**What was changed:** Replaced with `osd_mclock_scheduler_client_res`, which is the correct parameter for client I/O reservation in the current mClock scheduler.

### 4. CephNVMeOFGateway CRD kind and spec errors (Moderate)
**What was wrong:** The CRD kind was `CephNVMeoFGateway` (lowercase "o" in "oF") but the correct kind is `CephNVMeOFGateway` (uppercase "OF"). The spec used `spec.server.active` which doesn't exist — the correct field is `spec.instances`. Required fields `image`, `pool`, and `group` were also missing.
**What was changed:** Fixed the kind capitalization, replaced `server.active: 2` with `instances: 2`, and added the required `image`, `pool`, and `group` fields with placeholder values.

### 5. Impossible throughput claim for 25GbE (Minor)
**What was wrong:** The summary claimed "individual gateways can sustain 10+ GB/s throughput" with "25GbE+ networking." A single 25GbE link has a theoretical maximum of ~3.1 GB/s, making 10+ GB/s physically impossible even with bonded dual 25GbE (~6.25 GB/s).
**What was changed:** Changed "25GbE+" to "100GbE" which can actually deliver 10+ GB/s (~12.5 GB/s theoretical max).

## Review Notes
- The fio benchmark commands are correct and use appropriate parameters for sequential throughput testing (1M block size, direct I/O, libaio engine, 32 iodepth).
- The TCP buffer tuning values (128 MiB max) are reasonable for high-throughput NVMe-oF workloads.
- The `bluestore_cache_size_ssd` (4 GiB) and `ms_dispatch_throttle_bytes` (1 GiB) are valid Ceph parameters with reasonable values for throughput optimization.
- Ceph recommends using mClock QoS profiles (`osd_mclock_scheduler_qos_default_profile`) rather than setting individual mClock parameters directly. The blog could mention this as the preferred approach.
- The persistent sysctl config block (`/etc/sysctl.d/99-nvmeof.conf`) only includes buffer sizes but not `tcp_window_scaling` — this is fine since `tcp_window_scaling` defaults to enabled on modern kernels.
