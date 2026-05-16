# Validation Summary: How to Include Custom Kernel Modules via Image Factory

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (v1.7)
- Talos Image Factory
- System Extensions
- talosctl CLI
- NVIDIA open GPU kernel modules and Container Toolkit
- ZFS, DRBD, iSCSI Tools storage extensions
- Intel/AMD microcode and i915-ucode firmware extensions
- Broadcom (bnx2/bnx2x), Realtek, Thunderbolt network/driver extensions
- Kubernetes (NVIDIA device plugin)

## Sources Consulted
- Talos NVIDIA GPU guide (v1.7): https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/hardware-and-drivers/nvidia-gpu
- Talos boot assets / Image Factory docs: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets/
- siderolabs/extensions repository (release-1.7 branch): https://github.com/siderolabs/extensions/tree/release-1.7
- talosctl CLI reference (v1.7): https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Image Factory: https://factory.talos.dev
- nvidia-modules pkg.yaml (release-1.7) confirming the published extension name `nvidia-open-gpu-kernel-modules`

## Issues Found
- **Incorrect sysctl for NVIDIA container runtime**: The post originally used `net.core.bpf_jit_enable: "1"`. The official Talos NVIDIA GPU documentation specifies `net.core.bpf_jit_harden: 1` as the required sysctl. Updated the post to use `net.core.bpf_jit_harden: "1"` (keeping the string-quoted value for YAML consistency with the surrounding patch).

## Review Notes
- All `siderolabs/*` extension names referenced in the post (`bnx2-bnx2x`, `realtek-firmware`, `thunderbolt`, `zfs`, `drbd`, `iscsi-tools`, `nvidia-open-gpu-kernel-modules`, `nvidia-container-toolkit`, `intel-ucode`, `amd-ucode`, `i915-ucode`) are valid for Talos v1.7 (verified against the `release-1.7` branch of `siderolabs/extensions`).
- Note for future updates: in newer Talos releases (post-v1.7), the NVIDIA extensions have been split into `-lts` and `-production` variants (e.g., `nvidia-open-gpu-kernel-modules-lts`, `nvidia-container-toolkit-lts`), and `i915-ucode` has been merged into the `i915` driver extension. The post is correct for the `v1.7.0` target it specifies, but readers using newer Talos versions will need the updated names.
- The Image Factory schematic schema (`customization.systemExtensions.officialExtensions`, `customization.extraKernelArgs`) is accurate.
- The `talosctl gen config --install-image` flag is correct.
- `machine.kernel.modules` schema with `name` and `parameters` is correct.
- The `talosctl read /proc/modules`, `talosctl get extensions`, and `talosctl dmesg` commands are all valid talosctl subcommands.
- The NVIDIA kernel module list (`nvidia`, `nvidia_uvm`, `nvidia_drm`, `nvidia_modeset`) matches the official Talos NVIDIA guide.
