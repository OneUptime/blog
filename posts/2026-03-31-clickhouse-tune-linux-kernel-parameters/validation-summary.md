# Validation Summary: How to Tune Linux Kernel Parameters for ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse
- Linux kernel (sysfs, sysctl, transparent huge pages, I/O schedulers)
- systemd service configuration
- Linux PAM limits (`/etc/security/limits.d/`)
- Linux network stack tuning (TCP buffer sizes, backlog queues)
- CPU frequency scaling (cpupower, scaling_governor)
- NUMA balancing

## Sources Consulted
- ClickHouse official documentation: Operations Tips (https://clickhouse.com/docs/en/operations/tips)
- Linux kernel documentation on transparent huge pages (`/sys/kernel/mm/transparent_hugepage/`)
- Linux kernel documentation on vm.swappiness, vm.overcommit_memory, vm.dirty_ratio, vm.dirty_background_ratio
- Linux kernel block layer documentation on I/O schedulers (none, mq-deadline, bfq, cfq removal in 5.0)
- Linux kernel commit history: CFQ scheduler removed in kernel 5.0 (blk-mq transition)
- sysctl documentation for network tuning parameters (net.core.rmem_max, net.ipv4.tcp_rmem, etc.)
- cpupower man page and `/sys/devices/system/cpu/cpu*/cpufreq/scaling_governor` documentation
- systemd.exec documentation for LimitNOFILE

## Issues Found

1. **Misleading comment: "Disable swap"** — The comment on `vm.swappiness=1` said "Disable swap" but swappiness=1 only minimizes swap usage; it does not disable swap. Disabling swap entirely requires `swapoff -a` or `vm.swappiness=0`. Changed the comment to "Minimize swap usage."

2. **Incorrect comment: "Reduce dirty page flush frequency"** — The comment described the effect of `vm.dirty_ratio=10` and `vm.dirty_background_ratio=5` backwards. These values are *lower* than the defaults (20 and 10 respectively), which causes the kernel to begin flushing dirty pages *sooner* and more *frequently* in smaller batches — not less frequently. Changed the comment to "Flush dirty pages more frequently in smaller batches."

3. **Deprecated I/O scheduler: `cfq`** — The post recommended `cfq` for spinning disks, but the CFQ (Completely Fair Queuing) scheduler was removed from the Linux kernel in version 5.0 (March 2019) as part of the transition to the blk-mq (multi-queue) block layer. The modern replacement for rotational disks is `bfq` (Budget Fair Queueing) or `mq-deadline`. Changed the recommendation from `deadline` or `cfq` to `mq-deadline` or `bfq`, and updated the HDD command example from `echo deadline` to `echo mq-deadline`.

## Review Notes
- The section title "Disable NUMA Balancing for Single-Socket Servers" is slightly misleading. NUMA balancing is primarily relevant for multi-socket servers or single-socket AMD EPYC processors with multiple NUMA nodes per socket. On a true single-NUMA-node system, disabling it is harmless but has no effect. The underlying advice (disable NUMA auto-balancing for ClickHouse) is correct.
- The summary claim of "10-30% query latency reduction" is plausible but highly workload-dependent. It is stated with appropriate hedging ("can reduce").
- The `vm.overcommit_memory=1` setting (always overcommit) is acceptable but not the official ClickHouse recommendation. ClickHouse docs suggest keeping the default (`0`) or using `1`, but warn against `2`. The current value is not incorrect.
