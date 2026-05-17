# Validation Summary: How to Configure Extra Kernel Arguments in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6 referenced via installer image)
- `talosctl` CLI
- Linux kernel boot parameters
- Linux sysctls
- YAML machine configuration / JSON Patch / Strategic Merge Patch

## Sources Consulted
- Talos v1.6 configuration reference (`machine.install.extraKernelArgs`): https://docs.siderolabs.com/talos/v1.6/reference/configuration/v1alpha1/config/
- Talos v1.6 kernel parameters reference: https://docs.siderolabs.com/talos/v1.6/reference/kernel/
- Talos v1.6 configuration patches guide: https://www.talos.dev/v1.6/talos-guides/configuration/patching/
- Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.6/reference/cli/
- Red Hat documentation on `elevator=` deprecation (RHEL 8/9 release notes and solution 3799391): https://access.redhat.com/solutions/3799391
- Linux kernel `admin-guide/kernel-parameters.txt` documentation

## Issues Found

1. **Invalid `talos.debug=true` example in the "Why You Might Need Extra Kernel Arguments" section.**
   - `talos.debug` is not a documented Talos kernel parameter. The official list of `talos.*` parameters (talos.platform, talos.config, talos.hostname, talos.shutdown, talos.environment, talos.dashboard.disabled, etc.) does not include a `talos.debug` flag.
   - Fix: Replaced the example with `panic=10`, which is a real kernel parameter mentioned in the official Talos kernel reference as useful for collecting debug info before reboot. Kept `console=ttyS0` as the other example.

2. **`elevator=none` listed as a common kernel argument.**
   - The `elevator=` boot parameter was removed from the upstream Linux kernel when the legacy single-queue block I/O layer was retired (Linux 5.0+). Talos v1.6 ships a 6.x kernel, so `elevator=none` is silently ignored and does not set the I/O scheduler. Modern kernels require setting the scheduler per device via `/sys/block/<dev>/queue/scheduler` (e.g., via udev rules).
   - Fix: Removed the `elevator=none` entry (and its preceding comment) from the "Common Kernel Arguments for Talos" YAML block to avoid recommending a no-op parameter.

## Review Notes
- The core `machine.install.extraKernelArgs` field, types, and example syntax match the official Talos v1.6 reference exactly.
- `talosctl gen config --config-patch` (with inline JSON Patch or `@file` reference), `talosctl patch machineconfig --nodes --patch`, `talosctl upgrade --nodes --image`, and `talosctl read /proc/cmdline` are all valid and current commands.
- `talosctl get systemstat` exists as a Talos resource (it exposes BootTime among other fields), so using it to confirm a reboot is reasonable.
- The other listed kernel arguments (`net.ifnames=0`, `transparent_hugepage=never`, `intel_iommu=on`, `iommu=pt`, `nvme_core.default_ps_max_latency_us=0`, `slab_nomerge`, `init_on_alloc=1`, `init_on_free=1`, `nokaslr`, `console=ttyS0,115200n8`) are all valid upstream Linux kernel parameters and behave as described.
- Version-specific caveat: the installer image `ghcr.io/siderolabs/installer:v1.6.0` is used in examples; readers running newer Talos releases should substitute the matching installer tag. This is normal for a v1.6-era tutorial and not a defect.
