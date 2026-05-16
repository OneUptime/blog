# Validation Summary: How to Optimize Disk I/O Performance on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`, `extraKernelArgs`, `machine.sysctls`, `machine.disks`)
- Linux kernel block layer / blk-mq I/O schedulers (`none`, `mq-deadline`, `kyber`, `bfq`)
- Linux VM tunables (`vm.dirty_ratio`, `vm.dirty_background_ratio`, `vm.dirty_expire_centisecs`, `vm.dirty_writeback_centisecs`, `vm.swappiness`)
- Kubernetes (DaemonSet, Pod QoS, StorageClass)
- Longhorn CSI driver (`driver.longhorn.io`, `numberOfReplicas`, `dataLocality`)
- Prometheus node_exporter (disk metrics)
- Filesystem mount options (`noatime`, `nodiratime`, `discard`)
- sysfs block device tunables (`read_ahead_kb`, `scheduler`, `rotational`)

## Sources Consulted
- Talos Linux MachineConfig reference (v1.10): https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos Disk Management docs (v1.9): https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos `talosctl read` documentation
- Red Hat KB on `elevator=` behavior with blk-mq: https://access.redhat.com/solutions/3799391
- Linux Kernel queue-sysfs docs: https://www.kernel.org/doc/html/latest/block/queue-sysfs.html
- SUSE I/O performance tuning docs: https://documentation.suse.com/sles/15-SP7/html/SLES-all/cha-tuning-io.html
- Longhorn Data Locality docs: https://longhorn.io/docs/1.11.1/high-availability/data-locality/
- Longhorn StorageClass parameters: https://longhorn.io/docs/
- Prometheus node_exporter source/docs (diskstats collector): https://github.com/prometheus/node_exporter
- "Mapping iostat to node_exporter metrics" — Robust Perception

## Issues Found

1. **`elevator=` kernel boot parameter does not work for blk-mq devices** (the default on Linux 5.0+).
   - **Original:** Recommended setting `elevator=none`, `elevator=mq-deadline`, `elevator=bfq` via `machine.install.extraKernelArgs`.
   - **Problem:** The legacy `elevator=` boot parameter is ignored under blk-mq; Talos kernels are 6.x where the legacy single-queue block layer no longer exists. Setting it has no effect (and modern kernels print a deprecation warning).
   - **Fix:** Replaced the three `extraKernelArgs` snippets with a single privileged DaemonSet that writes to `/sys/block/<dev>/queue/scheduler` per device, choosing `none` for NVMe, `mq-deadline` for SATA SSDs, and `bfq` for rotational disks (detected via `/sys/block/<dev>/queue/rotational`). Added a `talosctl read /sys/block/<dev>/queue/scheduler` example to verify the active scheduler.

2. **`/var/lib/etcd` and `/var/lib/containerd` cannot be used as `machine.disks` mountpoints.**
   - **Original:** Disk partitioning example mounted `/dev/nvme0n1` at `/var/lib/etcd` and `/dev/nvme1n1` at `/var/lib/containerd` via `machine.disks`.
   - **Problem:** Talos restricts user-defined disk mountpoints; they cannot overlap with system paths managed by the EPHEMERAL partition. `/var/lib/etcd` and `/var/lib/containerd` live on EPHEMERAL and cannot be remounted this way. User mounts must live under `/var/mnt/...`.
   - **Fix:** Rewrote the example to mount the additional disks at `/var/mnt/fast` and `/var/mnt/longhorn`. Added a paragraph explaining that the supported way to put etcd on a dedicated fast device is to install Talos itself onto that device (so EPHEMERAL — and therefore the etcd data directory — lives there), with `machine.disks` reserved for application data and CSI volumes.

## Review Notes
- The `vm.*` sysctl values, including the low-latency (`dirty_ratio: 5`, `dirty_expire_centisecs: 100`) and high-throughput (`dirty_ratio: 40`, `dirty_expire_centisecs: 6000`) profiles, are valid and reasonable; note that `vm.dirty_ratio: 40` happens to equal the kernel's historical default.
- `noatime` already implies `nodiratime` on Linux, so listing both in `mountOptions` is redundant but not incorrect — left as-is since the post is showing common conventions.
- The `discard` mount option enables online TRIM; some operators prefer periodic `fstrim` instead for predictability, but online discard is valid and commonly used.
- `vm.swappiness` is mostly informational on Talos since swap is not configured by default, but setting it does no harm.
- The privileged DaemonSet for read-ahead and the new scheduler DaemonSet both rely on Pod Security policies allowing privileged pods in `kube-system`; this is the default on stock Talos but worth noting for hardened clusters.
- Newer Talos versions (1.7+) introduce `UserVolumeConfig` and richer volume resources for more complex disk layouts; the post sticks to the broadly-supported `machine.disks` schema, which is appropriate for an introductory guide.
