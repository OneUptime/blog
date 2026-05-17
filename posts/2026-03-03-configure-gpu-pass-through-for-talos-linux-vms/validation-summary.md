# Validation Summary: How to Configure GPU Pass-Through for Talos Linux VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7)
- NVIDIA GPU drivers / kernel modules
- VFIO / IOMMU (Intel VT-d, AMD-Vi)
- QEMU / KVM
- Proxmox VE (qm CLI)
- OVMF (UEFI firmware)
- Talos Image Factory & system extensions
- Kubernetes
- NVIDIA Kubernetes Device Plugin
- CUDA container images

## Sources Consulted
- Talos system extensions guide: https://www.talos.dev/v1.7/talos-guides/configuration/system-extensions/
- Talos NVIDIA GPU guide: https://www.talos.dev/v1.7/talos-guides/configuration/nvidia-gpu/
- siderolabs/extensions repository: https://github.com/siderolabs/extensions
- Talos Image Factory: https://factory.talos.dev
- Talos issue siderolabs/talos#9224 (machine.install.extensions deprecation)
- NVIDIA k8s-device-plugin repo: https://github.com/NVIDIA/k8s-device-plugin
- Docker Hub `nvidia/cuda` tags: https://hub.docker.com/r/nvidia/cuda/tags
- NVIDIA KB on GeForce passthrough (driver 465+): https://nvidia.custhelp.com/app/answers/detail/a_id/5173
- Linux kernel IOMMU parameters (admin-guide/kernel-parameters)
- Proxmox VE `qm` CLI documentation: https://pve.proxmox.com/pve-docs/qm.1.html

## Issues Found

1. **Incorrect Image Factory extension names** — The profile referenced `siderolabs/nvidia-container-toolkit`, `siderolabs/nvidia-open-gpu-kernel-modules`, and `siderolabs/nvidia-fabricmanager` as bare names. The Talos Image Factory does not publish these without a variant suffix; valid names require `-lts` or `-production` (e.g., `siderolabs/nvidia-container-toolkit-lts`). Updated the profile to use the `-lts` variants.

2. **Deprecated `machine.install.extensions` snippet** — The post showed installing NVIDIA extensions via `machine.install.extensions` in the machine config. This field was deprecated in Talos v1.5 and has no effect in later versions; extensions must be baked into the boot image via the Image Factory. Removed the deprecated extensions snippet, added a note explaining the change, and kept the kernel-modules snippet (which is still valid under `machine.kernel.modules`).

3. **Non-existent CUDA image tag** — The example pod used `nvidia/cuda:12.0-base`, which is not a published tag on Docker Hub. NVIDIA's CUDA tags are versioned as `<major>.<minor>.<patch>-<variant>-<os>`. Updated to `nvidia/cuda:12.0.0-base-ubuntu22.04`, which is a real published tag.

## Review Notes
- The `-cpu host,kvm=off` QEMU option is described as needed to prevent NVIDIA drivers from refusing to run in a VM. NVIDIA removed this consumer-GPU hypervisor check around driver R465 (March 2021) and officially supports GeForce passthrough since then, so `kvm=off` is no longer strictly required on modern drivers. Many community guides still include it defensively, so the post's recommendation is reasonable but slightly conservative.
- The Proxmox `--hostpci0 ... x-vga=1` flag is appropriate when the passed-through GPU is the VM's primary display; for headless ML workloads where the VM doesn't render anything on the GPU, `x-vga=1` can be omitted. This is a stylistic nit and was not changed.
- The post uses the static NVIDIA device plugin manifest from `main`. NVIDIA's current recommendation for production is the GPU Operator (or Helm chart), but the static manifest still works and is appropriate for a tutorial.
- IOMMU kernel parameters, lspci usage, VFIO module list, QEMU q35/OVMF flags, `talosctl` commands, and the NVIDIA device plugin URL were all verified correct.
