# Validation Summary: How to Configure IRQ Affinity on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, machine configuration)
- Linux IRQ subsystem (`/proc/irq`, `/proc/interrupts`, `smp_affinity`)
- `irqbalance` daemon (context only)
- Kubernetes DaemonSets, privileged containers, host namespaces
- ethtool (multi-queue NIC tuning, RSS flow hashing)
- Linux kernel CPU isolation parameters (`isolcpus`, `nohz_full`, `rcu_nocbs`)

## Sources Consulted
- Talos `talosctl` source — confirmed `talosctl read <path>` exists and streams arbitrary files from the node: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/read.go
- Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- GitHub code search across `org:siderolabs` for `irqbalance` — 0 results, confirming Talos does not ship the daemon.
- Linux kernel `kernel/irq/proc.c` — what files actually exist under `/proc/irq/<irq>/`: https://github.com/torvalds/linux/blob/master/kernel/irq/proc.c
- Linux kernel sysfs IRQ ABI doc — confirms the `actions` file lives at `/sys/kernel/irq/<irq>/actions`, not under `/proc/irq`: https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-kernel-irq
- Linux generic IRQ documentation: https://docs.kernel.org/core-api/genericirq.html
- ethtool man page conventions for `-L` (combined/rx/tx queue count) and `-N rx-flow-hash`.

## Issues Found

1. **Incorrect claim that Talos runs `irqbalance`** — Original text stated "On Talos Linux, `irqbalance` runs as part of the system services. While you cannot disable it directly through configuration, you can override its decisions...". A code search across `org:siderolabs` returned zero references to `irqbalance`; Talos is a minimal distribution and does not include the daemon. Rewrote the "The Default IRQ Distribution Problem" section to state that Talos does not ship `irqbalance`, and to describe the actual failure modes of kernel default IRQ routing (default affinity covers all online CPUs; multi-queue NIC drivers spread queue IRQs across every core). Also updated the trailing sentence after the first DaemonSet that explained the 5-minute reapply as compensating for irqbalance overrides — now describes driver reloads / link state changes / new IRQ registration as the reason.

2. **Non-existent `/proc/irq/<irq>/actions` file** — The first DaemonSet's `set_nic_affinity()` function checked `[ -f "$irq_dir/actions" ]` and then `grep`ed it for the interface name. That file does not exist in `/proc/irq/<irq>/`; the IRQ action chain is exposed at `/sys/kernel/irq/<irq>/actions` (newer sysfs interface) and the per-handler entry under `/proc/irq/<irq>/` is a subdirectory named after the handler, not a file. As written, the conditional would always be false and the DaemonSet would never set any affinity. Rewrote the function to parse `/proc/interrupts` (the canonical, long-stable interface), matching the same approach already used by the second DaemonSet for multi-queue NICs. The new function greps for IRQ lines that include the interface name in the device column, extracts the IRQ number, and writes the mask to `/proc/irq/<irq>/smp_affinity`.

## Review Notes

- `talosctl read /proc/interrupts --nodes <ip>` is valid. The `read` command exists in `cmd/talosctl/cmd/talos/read.go` and forwards an arbitrary file path through the machine API; virtual files under `/proc` are routinely accessed this way (e.g., the existing `talosctl read /proc/cpuinfo` pattern).
- `extraKernelArgs` under `machine.install` is the correct Talos machine-config location for kernel command-line additions.
- `isolcpus=`, `nohz_full=`, `rcu_nocbs=` syntax matches upstream kernel parameter docs.
- `ethtool -L <iface> combined N` and `ethtool -N <iface> rx-flow-hash <proto> sdfn` are correct ethtool invocations.
- All hex bitmask examples in the "Understanding CPU Affinity Masks" section are correct.
- Driver-name examples (`mlx5_comp`, `ixgbe`, `virtio`) are valid prefixes that appear in `/proc/interrupts` for the named hardware/driver.
- Host-namespace caveat (not a correctness bug, but worth noting): `/proc/irq` writes from inside a container reach the host's IRQ subsystem because IRQs are global to the kernel, but the procfs *mount* visible to the container is the container's own. With `privileged: true` and the default Alpine container that has `procfs` mounted at `/proc`, writes do reach the host IRQ descriptors — this works in practice, but a future revision could mount `/proc` from the host explicitly (`hostPath: /proc`) for extra robustness against changes in container runtime defaults.
- `local` is used inside `/bin/sh` functions. Alpine's BusyBox `ash` supports `local`, so this works as-is, but it is not strictly POSIX.
