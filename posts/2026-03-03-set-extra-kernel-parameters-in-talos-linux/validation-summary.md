# Validation Summary: How to Set Extra Kernel Parameters in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `extraKernelArgs`)
- `talosctl` CLI (`read`, `apply-config`, `patch machineconfig`, `reboot`, `dmesg`)
- Linux kernel command-line parameters (IOMMU, hugepages, mitigations, I/O scheduler, ACPI, etc.)
- YAML machine config (controlplane/worker)
- JSON Patch (RFC 6902) syntax via `talosctl patch`
- iPXE / PXE boot scripts
- Sidero Labs installer image (`ghcr.io/siderolabs/installer`)

## Sources Consulted
- Talos v1.9 machine config reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos v1.9 `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos kernel reference (default cmdline args): https://docs.siderolabs.com/talos/v1.9/reference/kernel/
- Linux kernel admin-guide kernel-parameters.txt (kernel.org)
- Linux block layer / switching-sched docs: https://www.kernel.org/doc/html/v5.3/block/switching-sched.html
- Sidero Labs Talos GitHub releases: https://github.com/siderolabs/talos/releases
- LKDDB entry for `randomize_kstack_offset` (Linux 5.13+)

## Issues Found
- **`elevator=deadline` is incorrect on modern kernels** (line 216). Talos Linux ships modern Linux kernels that use the multi-queue block layer (blk-mq, default since Linux 5.0). In multi-queue, the legacy single-queue `deadline` scheduler was renamed to `mq-deadline`; `elevator=deadline` does not match a valid blk-mq scheduler. Changed to `elevator=mq-deadline` and updated the surrounding comment accordingly.

All other technical content verified correct:
- `machine.install.extraKernelArgs` YAML path and list-of-strings format ✓
- `talosctl read /proc/cmdline`, `talosctl dmesg`, `talosctl reboot` ✓
- `talosctl apply-config --insecure` for maintenance-mode (USB-boot) nodes ✓
- `talosctl patch machineconfig --patch '<json>'` and `--patch @file.yaml` ✓
- JSON Patch op/path/value syntax for adding `extraKernelArgs` ✓
- Default Talos cmdline args (`talos.platform`, `slab_nomerge`, `pti=on`) ✓ (`init_on_alloc=1` is enabled via kernel config rather than always added as a cmdline arg, but appears in the cmdline of typical Talos builds — claim is fair)
- `randomize_kstack_offset=on` is a real Linux kernel param (added in 5.13) ✓
- `ghcr.io/siderolabs/installer:v1.9.0` is a real image tag ✓
- Standard Linux kernel params (`intel_iommu=on`, `iommu=pt`, `net.ifnames=0`, `biosdevname=0`, `mitigations=auto`, `nosmt`, `transparent_hugepage=never`, `pci=noaer`, `clocksource=tsc`, `nowatchdog`) ✓

## Review Notes
- The `elevator=` kernel parameter itself is essentially advisory on modern blk-mq kernels — many distros set the I/O scheduler via udev rules rather than the kernel command line. The post's example will at least name a real scheduler after the fix, but readers tuning production systems may want to use a udev rule (which Talos can ship via machine config extensions) for per-device control.
- `mitigations=auto` is the kernel default; listing it explicitly is harmless but redundant.
- `acpi_osi="Windows 2020"` is passed as a single YAML string entry, which Talos forwards to the kernel command line including the embedded quotes — this works in practice but readers should be aware that the kernel sees the quotes as part of the value.
- The post references Talos v1.9.0 in the installer image; if/when newer minor versions (v1.10+) become standard, the example tag may want a refresh, but the field/CLI semantics shown have been stable across 1.x.
