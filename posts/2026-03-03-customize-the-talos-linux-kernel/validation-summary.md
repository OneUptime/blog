# Validation Summary: How to Customize the Talos Linux Kernel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Linux kernel build system (Kconfig, menuconfig, patches)
- siderolabs/pkgs build system
- siderolabs/talos build system (initramfs, installer, ISO)
- talosctl CLI
- Docker (as the kernel build runtime)
- Kubernetes (as the target workload)

## Sources Consulted
- siderolabs/pkgs repository: https://github.com/siderolabs/pkgs (kernel config at `kernel/build/config-amd64`, `kernel/build/config-arm64`, patches at `kernel/build/patches/`)
- siderolabs/talos repository: https://github.com/siderolabs/talos (initramfs, installer, iso make targets)
- Sidero Labs "Customizing the Kernel" docs: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/custom-images-and-development/customizing-the-kernel
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero NVIDIA GPU guide (confirms `talosctl read /proc/...` usage): https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/hardware-and-drivers/nvidia-gpu

## Issues Found
1. **Wrong repository for kernel config**: Post claimed kernel config and patches live in `siderolabs/talos` at `pkg/kernel/build/`. They actually live in the separate `siderolabs/pkgs` repository at `kernel/build/`. Rewrote the "Understanding the Default Kernel Configuration" section to clone `siderolabs/pkgs` and use the correct path. Fixed all subsequent path references (`pkg/kernel/build/...` → `kernel/build/...`) in the Direct Editing, Patches, and Maintenance sections.
2. **`make kernel-menuconfig` location**: This target only exists in the `pkgs` repo, not `talos`. Added a note clarifying it runs from the `pkgs` repo.
3. **Building installer/initramfs/iso**: Those targets only exist in the `talos` repo, not `pkgs`. Rewrote the "Building a Complete Image" section to explicitly switch repos (`cd ../talos`) and pass `PKG_KERNEL=...` so the talos image build consumes the custom kernel image produced by the `pkgs` build.
4. **`make kernel TAG=...` flag**: The `TAG` variable is not the standard mechanism in `pkgs` for publishing a custom kernel; the pkgs build uses `PUSH=true USERNAME=...` (or a `REGISTRY`/`USERNAME` override) to publish to a registry that the talos build can pull from. Updated the example accordingly.
5. **Maintenance workflow**: Updated to reflect the two-repo workflow (both `pkgs` and `talos` should be checked out at the matching release tag, with the kernel built/pushed from `pkgs` and the installer rebuilt in `talos`).
6. **`make kernel-olddefconfig`**: Added a one-line mention after the hand-edited config example so dependent options get filled in automatically — this is a standard kernel-config hygiene step the original post omitted.

## Review Notes
- The talosctl commands (`talosctl read /proc/config.gz`, `talosctl read /proc/modules`, `talosctl dmesg`, `talosctl cluster create --install-image=...`, `talosctl upgrade --image ... --nodes ...`) are all valid and current.
- The general high-level workflow (edit config → optionally apply patches → build kernel → build installer → test in QEMU → push to registry → rolling upgrade) is accurate.
- For most users who only need extra modules (NVIDIA, iSCSI, etc.) Talos system extensions are the recommended path and avoid maintaining a kernel fork; the post already mentions this in the conclusion, which is good.
- The example `PKG_KERNEL=ghcr.io/youruser/kernel:<tag>` placeholder follows current pkgs conventions, but exact variable names may shift between Talos releases — users should cross-reference the Makefile of the specific tag they are building against.
