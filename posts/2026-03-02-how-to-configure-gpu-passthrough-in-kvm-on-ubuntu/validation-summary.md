# Validation Summary: How to Configure GPU Passthrough in KVM on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- KVM
- QEMU
- libvirt
- virt-manager
- VFIO
- Linux kernel IOMMU parameters
- PCI device passthrough
- GRUB and initramfs configuration

## Sources Consulted
- Linux kernel command-line parameter documentation: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Linux kernel VFIO documentation: https://www.kernel.org/doc/html/v6.15/driver-api/vfio.html
- Linux kernel driver binding documentation: https://docs.kernel.org/driver-api/driver-model/binding.html
- Ubuntu Server documentation for libvirt: https://ubuntu.com/server/docs/how-to/virtualisation/libvirt/
- Ubuntu Server documentation for virt-manager: https://ubuntu.com/server/docs/how-to/virtualisation/virtual-machine-manager/
- libvirt Domain XML documentation: https://libvirt.org/formatdomain.html

## Issues Found
- The AMD kernel command line used `amd_iommu=on`, but the upstream kernel parameter documentation does not list `on` as a valid `amd_iommu` option. I changed the AMD example to use `iommu=pt`, because AMD IOMMU support is normally initialized when enabled in firmware and `iommu=pt` is the relevant passthrough mapping option.
- The explanation of `iommu=pt` said it only enables the IOMMU for devices being passed through. The kernel documentation describes passthrough mode as bypassing IOMMU translation by default, so I reworded the explanation to say it uses passthrough mappings for devices not assigned to a VM.
- The VFIO modules list included `vfio_virqfd`, which is obsolete on current kernels and is not present as a separate module on modern Ubuntu releases. I removed it from the modules-load example.

## Review Notes
- The libvirt `<hostdev>`, `<features>`, CPU pinning, and huge pages XML snippets match documented libvirt elements.
- The Ubuntu package installation guidance is consistent with Ubuntu Server documentation, with additional packages included for GUI and client management workflows.
- GPU passthrough remains hardware- and firmware-sensitive; users may still need device-specific adjustments such as ROM files, framebuffer handling, reset workarounds, or vendor-specific driver handling.
