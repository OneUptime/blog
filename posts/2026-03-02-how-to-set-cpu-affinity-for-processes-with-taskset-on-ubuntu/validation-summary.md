# Validation Summary: How to Set CPU Affinity for Processes with taskset on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `taskset` (util-linux)
- Linux CPU affinity / scheduler
- systemd unit `CPUAffinity` directive
- `isolcpus` kernel boot parameter / GRUB
- `chrt` (real-time scheduling)
- `lscpu`, `/proc/cpuinfo`, `lstopo` (hwloc)
- `/proc/irq/<N>/smp_affinity` (IRQ affinity via sysfs/procfs)
- `ps -o psr`, `pidstat`
- Ubuntu / Linux system administration

## Sources Consulted
- `man taskset` (util-linux) — verified flag semantics (`-p`, `-c`, `-cp`), mask vs. list output format, hex bitmask interpretation.
- Ubuntu Manpages — `lstopo(1)` on noble (https://manpages.ubuntu.com/manpages/noble/man1/lstopo.1.html) — confirmed `lstopo-no-graphics` is a sibling binary, not a flag on `lstopo`.
- Linux kernel sysfs ABI docs (`Documentation/ABI/testing/sysfs-bus-pci`) — verified that `/sys/.../msi_irqs/<N>` filenames are IRQ numbers and file contents are mode strings ("msi"/"msix").
- systemd.exec(5) — `CPUAffinity=` accepts whitespace- or comma-separated CPU indices and ranges (e.g. `0 1 2 3` or `0-3`), confirming both forms shown.
- Linux kernel admin-guide `kernel-parameters.txt` — `isolcpus=` boot parameter and its use to keep the scheduler off listed CPUs.
- `chrt(1)` — `-f` sets SCHED_FIFO with the given static priority.
- `ps(1)` — `psr` output specifier reports the processor a process is currently assigned to.

## Issues Found
1. **Wrong `lstopo` invocation.** The post used `lstopo --no-graphics`, but `--no-graphics` is not a flag accepted by `lstopo`. The hwloc package ships a separate binary `lstopo-no-graphics` (alongside `lstopo` and `hwloc-ls`) that is the text-only equivalent. Changed the command to `lstopo-no-graphics`.

2. **Broken IRQ affinity one-liner.** The original command was:
   ```
   echo 1 > /proc/irq/$(cat /sys/class/net/eth0/device/msi_irqs/$(ls /sys/class/net/eth0/device/msi_irqs | head -1))/smp_affinity
   ```
   The inner `cat` reads `/sys/.../msi_irqs/<N>`, whose contents are the vector mode (e.g. `msi` or `msix`) per the kernel sysfs ABI — not the IRQ number. The IRQ number is the *filename* (the `ls` output). The command therefore resolved to a non-existent path like `/proc/irq/msix/smp_affinity`. Rewrote it to use the `ls` result directly:
   ```
   echo 1 | sudo tee /proc/irq/$(ls /sys/class/net/eth0/device/msi_irqs | head -1)/smp_affinity
   ```
   Also switched `>` to `sudo tee` because `/proc/irq/<N>/smp_affinity` requires root to write, and shell redirection with `sudo echo` would not elevate the redirect.

## Review Notes
- `isolcpus=` still works on current Ubuntu kernels but has been marked as deprecated in favor of `cpuset`/`cgroup` isolation in some upstream documentation. The example is fine as a quick-start; a future revision could mention the `isolcpus=domain,managed_irq,<list>` extended syntax or point at the `cpuset` cgroup approach.
- The "skipping hyperthreads" comment next to `taskset -c 0,2,4` assumes the Intel-style enumeration where siblings are interleaved or paired with `N/2` offset; on AMD or with non-default enumeration this may not skip SMT siblings. Readers should consult `lscpu -e` for actual sibling mappings — the post already points them at topology tools, so this is a soft caveat rather than an error.
- The example NIC IRQ-affinity snippet only sets a single queue's affinity. Multi-queue NICs typically benefit from a script like `set_irq_affinity` from the driver vendor or a tool like `irqbalance --banscript`; out of scope for this post but worth knowing.
- `taskset` operates on the thread group leader by default; for finely threaded apps, `-a/--all-tasks` may be needed to affect every thread. Not mentioned in the post, but only a soft omission.
