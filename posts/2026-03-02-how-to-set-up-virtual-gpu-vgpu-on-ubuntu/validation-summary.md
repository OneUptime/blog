# Validation Summary: How to Set Up Virtual GPU (vGPU) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NVIDIA vGPU (Virtual GPU) software
- NVIDIA vGPU Manager (host driver) / nvidia-vgpu-mgr
- NVIDIA GRID guest driver / nvidia-gridd license daemon
- KVM/QEMU
- libvirt (virt-manager, virsh, nodedev-create)
- Mediated devices (mdev / VFIO)
- SR-IOV (single root I/O virtualization)
- Ubuntu 20.04 / 22.04
- systemd unit files
- AMD GPU SR-IOV (brief mention)

## Sources Consulted
- NVIDIA Virtual GPU Software Documentation: https://docs.nvidia.com/grid/
- NVIDIA vGPU User Guide (host/guest install, gridd.conf, FeatureType values): https://docs.nvidia.com/grid/latest/grid-vgpu-user-guide/
- `nvidia-smi vgpu --help` documented options (-s, -c, -q, -a, -u, -p, -v)
- libvirt domain XML reference for hostdev mdev: https://libvirt.org/formatdomain.html#mdev
- Linux kernel VFIO/mdev sysfs interface documentation
- NVIDIA hardware compatibility matrix for vGPU-capable GPUs (A10/A16/A30/A40/A100/T4/RTX 6000 Ada)
- Ubuntu GRUB IOMMU configuration documentation

## Issues Found
1. **Invalid `nvidia-smi vgpu --supported-vgpu` flag** — This is not a documented option. The standard verbose listing of supported vGPU types (with memory and capabilities) uses the existing `-s` flag with `-v` (verbose). Changed to `nvidia-smi vgpu -s -v`.
2. **Invalid `nvidia-smi vgpu --query-vgpu-stats=...` invocation** — The `nvidia-smi vgpu` subcommand does not accept `--query-*=field` selectors with `--format=csv,noheader` the way the top-level `nvidia-smi --query-gpu=` does. The documented option for vGPU utilization is `-u`. Changed to `nvidia-smi vgpu -u`.

## Review Notes
- The vGPU profile naming (`GRID A100-40C`, `GRID A100-10C`) and the example mdev type directory (`nvidia-105`) are illustrative — actual type IDs vary by GPU model and driver version; the post correctly notes this.
- `FeatureType=1` in `gridd.conf` is correct for NVIDIA RTX Virtual Workstation (vWS). Other valid values include `2` (Virtual PC) and `4` (Virtual Compute Server) — users should pick the value matching their licensed product.
- Default NVIDIA license server port `7070` is correct for the legacy GRID license server. NVIDIA's newer Cloud Licensing Service (NLS) uses HTTPS on port 443; users on NLS should follow NVIDIA's separate token-based instructions instead.
- `virsh nodedev-create` still works but newer libvirt versions also support `nodedev-define` + `nodedev-start` for persistent definitions; the post's approach remains valid.
- The 535.x driver branch referenced is appropriate for Ubuntu 20.04/22.04 at the time of writing; later branches (550.x, 570.x) are also available and may be preferred for newer hardware.
- Driver release 535.161.07 is paired with guest driver 537.70 on Windows; on Linux guests the matching guest driver is 535.161.08. The example filename is illustrative and the post correctly notes filenames vary.
- AMD vGPU/SR-IOV support is genuinely limited — it works mainly on data center cards (MI series and some newer Radeon Pro models) and the kernel-patch caveat is accurate.
