# Validation Summary: How to Pass Through PCI Devices (GPU, NIC) to Virtual Machines on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/libvirt virtualization
- PCI passthrough / PCI device assignment
- VFIO and vfio-pci
- IOMMU, Intel VT-d, and AMD-Vi
- virsh and virt-install
- dracut and grubby

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing GPU devices in virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_managing-gpu-devices-in-virtual-machines_configuring-and-managing-virtualization
- libvirt virsh manual page, node device and attach-device behavior: https://www.libvirt.org/manpages/virsh.html
- libvirt domain XML format, host device assignment: https://libvirt.org/formatdomain.html#host-device-assignment
- Linux kernel VFIO documentation: https://www.kernel.org/doc/html/v5.14/driver-api/vfio.html
- dracut.conf manual page: https://man7.org/linux/man-pages/man5/dracut.conf.5.html
- virt-install manual page: https://manpages.debian.org/trixie/virt-install/virt-install.1.en.html

## Issues Found
- The AMD IOMMU enablement command used `amd_iommu=on iommu=pt`. Current RHEL 9 GPU assignment documentation notes that AMD IOMMU is enabled by default on AMD hosts when supported, and documents adding `iommu=pt` to switch to pass-through mode. Updated the AMD command to use `sudo grubby --update-kernel=ALL --args="iommu=pt"`.

## Review Notes
The remaining VFIO binding commands, libvirt hostdev XML, `virsh nodedev-*` usage, `virt-install --host-device`, UEFI boot option, dracut `add_drivers` configuration, and IOMMU group guidance are consistent with the consulted documentation. RHEL's own GPU assignment procedure commonly uses `pci-stub` or `driverctl` for some GPU binding workflows, while the post uses `vfio-pci`; that approach is valid for VFIO passthrough but deployments with duplicate PCI IDs should take care because ID-based binding can affect all matching devices.
