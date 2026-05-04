# Validation Summary: How to Configure IRQ Affinity for Network Interfaces on Multi-Core Systems

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel IRQ subsystem (`/proc/interrupts`, `/proc/irq/N/smp_affinity`)
- Linux sysfs NUMA topology (`/sys/class/net/*/device/numa_node`, `/sys/devices/system/node/nodeN/cpulist`)
- Multi-queue NICs (RSS, MSI-X)
- `irqbalance` daemon
- Bash scripting
- `sysstat` / `mpstat`

## Sources Consulted
- Linux kernel SMP IRQ affinity documentation (https://www.kernel.org/doc/Documentation/IRQ-affinity.txt)
- irqbalance man page (https://manpages.debian.org/bookworm/irqbalance/irqbalance.1.en.html)
- Kernel sysfs documentation for net devices and NUMA topology

## Issues Found
No technical issues found.

The post correctly explains:
- The hexadecimal bitmask format of `/proc/irq/N/smp_affinity` (each bit = one CPU).
- The bitmask-to-CPU translations: `0x1`=CPU0, `0x2`=CPU1, `0xf`=CPUs 0-3, `0xff`=CPUs 0-7, `0xffff`=CPUs 0-15.
- Per-queue IRQ naming (`eth0-TxRx-N`) for multi-queue NICs.
- NUMA-aware affinity via `/sys/class/net/eth0/device/numa_node` and `/sys/devices/system/node/nodeN/cpulist`.
- `irqbalance` configuration via `/etc/default/irqbalance` and the `IRQBALANCE_BANNED_CPUS` and `IRQBALANCE_ARGS` environment variables (both are accepted by irqbalance).
- The `--deepestcache=N` flag (a real, documented irqbalance option).
- Bash arithmetic for shifting bits (`1 << (CPU % CPUS)`) to build per-CPU masks.
- `mpstat -P ALL 1 10` for verifying per-CPU IRQ distribution.

## Review Notes
- `IRQBALANCE_BANNED_CPUS` is still accepted by `irqbalance` but is deprecated in newer versions in favor of `IRQBALANCE_BANNED_CPULIST` (which uses a CPU list like `0-3,8` instead of a hex mask). The example still works on current systems but may emit a deprecation message; future revisions could prefer the cpulist form.
- `--deepestcache=2` is the upstream default in current `irqbalance` releases, so setting it explicitly is a no-op on most systems. The comment "Optimize for L2 cache" is a reasonable mental model but slightly imprecise — the option sets the cache index treated as the deepest cache for partitioning, not a generic "optimize for Ln" toggle.
- The `printf "%x" $((1 << CPU))` approach in the Step 4 script works for systems with up to ~63 CPUs (bash 64-bit arithmetic). For >32-CPU systems the kernel also accepts the comma-separated 32-bit-group form (e.g. `00000001,00000000`), but the single-hex form used here is also accepted. Out of scope for this post.
- The Step 5 NUMA example shows `cpulist` returning `0-15,32-47` but then sets the mask to `0xffff` (CPUs 0-15 only), omitting the hyperthread siblings 32-47. This is presented as a deliberate simplification ("Set affinity to CPUs 0-15") rather than an error; readers on real hardware would typically include siblings.
- Manual `smp_affinity` writes are reset on reboot; persistence (e.g. systemd unit, tuned profile, NIC vendor scripts like Intel's `set_irq_affinity`) is not covered but is mentioned implicitly via the reusable script. Worth a future expansion.
- `irqbalance` will override manual `smp_affinity` settings unless the IRQ is banned or the daemon is stopped. The post does not call this conflict out explicitly when presenting both approaches.
