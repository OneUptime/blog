# Validation Summary: How to Optimize etcd Performance on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- etcd (configuration flags, Prometheus metrics, snapshot/defrag)
- Kubernetes control plane
- Linux kernel sysctls (vm.*, net.*)
- Block I/O schedulers (blk-mq)

## Sources Consulted
- etcd v3.5 configuration: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd v3.5 tuning: https://etcd.io/docs/v3.5/tuning/
- etcd v3.5 maintenance (compaction): https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd v3.5 system limits (max-request-bytes): https://etcd.io/docs/v3.5/dev-guide/limit/
- Linux kernel IP sysctl docs: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel vm sysctl docs: https://www.kernel.org/doc/Documentation/sysctl/vm.txt
- Linux blk-mq documentation: https://docs.kernel.org/block/blk-mq.html
- Talos v1.x MachineConfig reference: https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- Talos disk management: https://www.talos.dev/v1.9/talos-guides/configuration/disk-management/
- Talos etcd maintenance: https://www.talos.dev/v1.12/advanced/etcd-maintenance/
- siderolabs/talos issue #9726 (etcd wal-dir cannot be relocated)
- Red Hat KB on net.ipv4.tcp_low_latency deprecation

## Issues Found

1. **Invalid sysctl `net.ipv4.tcp_nodelay`.** TCP_NODELAY is a per-socket option set via `setsockopt(IPPROTO_TCP, TCP_NODELAY, ...)`, not a kernel sysctl. Setting `net.ipv4.tcp_nodelay` in `machine.sysctls` would be rejected. Removed the line and replaced with a clarifying note that etcd already sets TCP_NODELAY on its peer sockets.

2. **No-op sysctl `net.ipv4.tcp_low_latency`.** This sysctl was made a no-op around kernel 4.14 (2017) and Talos runs much newer kernels. Removed the line.

3. **`elevator=none` kernel parameter is ignored on blk-mq.** The legacy `elevator=` boot parameter was removed when the legacy block layer was deleted; on modern blk-mq kernels it has no effect. Rewrote the I/O scheduler section to note that `none` is already the default scheduler for NVMe under blk-mq, and that SATA SSDs should be tuned per-device via sysfs.

4. **Mountpoint `/var/lib/etcd` is invalid for `machine.disks`.** Talos requires user-defined disk mountpoints to live under `/var/mnt/`, and the etcd data directory and WAL on Talos cannot be relocated (siderolabs/talos #9726) — they always live on the EPHEMERAL partition created on the install disk. Rewrote the storage example to install Talos directly on the NVMe drive so the EPHEMERAL partition (and thus etcd) ends up on fast storage, and showed `/var/mnt/...` as the correct mountpoint for any additional user disks.

5. **"At least 10x" election-timeout-to-heartbeat ratio overstates the official recommendation.** The etcd tuning guide says "at least 5x" (often quoted as 5–10x). Softened the wording to match the docs.

## Review Notes

- etcd configuration flags, metric names, and talosctl subcommands (`etcd members`, `etcd status`, `etcd defrag`, `etcd snapshot`, `service etcd`) are all correct.
- The `snapshot-count` default is 100000 in etcd v3.5 and was lowered to 10000 in v3.6 — the post's recommended value of 5000 is aggressive in either case but not incorrect.
- The `quota-backend-bytes` literal flag default is `0`, which etcd internally caps at 2 GiB. The post's "8GB backend quota" override is fine; 8 GiB is the documented supported maximum.
- `vm.overcommit_memory: "0"` is the kernel default; the inline comment correctly notes this. Setting it explicitly is harmless.
- The post does not specify an etcd version. Field names and defaults given are consistent with v3.5 (the version shipped with current Kubernetes releases supported by Talos as of 2026).
