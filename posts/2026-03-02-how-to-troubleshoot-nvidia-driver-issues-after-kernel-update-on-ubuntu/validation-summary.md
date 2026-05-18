# Validation Summary: How to Troubleshoot NVIDIA Driver Issues After Kernel Update on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ubuntu (Linux)
- NVIDIA proprietary and open-source kernel drivers
- DKMS (Dynamic Kernel Module Support)
- Linux kernel modules
- Secure Boot / MOK (Machine Owner Key) module signing
- mokutil, modinfo, modprobe
- apt / dpkg package management
- GRUB bootloader
- ubuntu-drivers tool
- GCC compiler
- systemd (display manager management)
- NVIDIA .run installer

## Sources Consulted
- Ubuntu package archive (apt-cache search) for NVIDIA package naming conventions
- DKMS man page and Ubuntu DKMS documentation: https://manpages.ubuntu.com/manpages/noble/man8/dkms.8.html
- Ubuntu NVIDIA driver documentation: https://ubuntu.com/server/docs/nvidia-drivers-installation
- NVIDIA Linux driver download URL format (us.download.nvidia.com)
- NVIDIA open GPU kernel module project (Turing+ GPU support): https://github.com/NVIDIA/open-gpu-kernel-modules
- Linux kernel module signing documentation (sign-file)
- mokutil(1) and modinfo(8) man pages
- Ubuntu apt-mark documentation

## Issues Found
1. **Incorrect Ubuntu package name `nvidia-kernel-open-545`** in the "Using the NVIDIA Open Kernel Module" section. This package does not exist in the Ubuntu archive. Verified the correct naming convention via `apt-cache search`: the open-variant packages are named `nvidia-driver-XXX-open` (metapackage), `nvidia-dkms-XXX-open` (DKMS source), and `nvidia-headless-XXX-open`. Changed `nvidia-kernel-open-545` to `nvidia-driver-545-open` and clarified the comment to indicate it is a metapackage versus installing the DKMS package directly.

## Review Notes
- The DKMS log path `/var/lib/dkms/<module>/<version>/<kernel>/<arch>/log/make.log` is the per-build log location used after a build attempt; a `build/make.log` symlink also exists under the module version directory for the most recent build. Either path works.
- The `--days 36500` (100 years) on the MOK signing certificate is unusual but valid; readers may want to choose a shorter validity.
- The GRUB menu access keys (Shift for BIOS, Esc for UEFI) are an Ubuntu convention; behavior can vary by system and Ubuntu version, but the guidance matches the official Ubuntu documentation.
- The list "RTX 20xx, 30xx, 40xx, A-series datacenter GPUs" for the open kernel module is incomplete — the open module also supports GTX 16xx (Turing) and Volta datacenter GPUs (V100) — but the statement is not inaccurate, only conservative.
- NVIDIA driver 545.x was a short-lived "new feature" branch; production users should generally prefer a current LTS branch (e.g., 535.x or 550.x+), but using 545 as the running example is fine for a troubleshooting walkthrough.
- The `sign-file` script path `/usr/src/linux-headers-$(uname -r)/scripts/sign-file` is correct for Ubuntu's signed kernels.
- All other commands (dkms status/install/remove/autoinstall, apt-mark hold, ubuntu-drivers, mokutil, modinfo, runfile install with `--dkms`) were verified as syntactically correct and current.
