# Validation Summary: How to Pass Through PCI Devices (GPU, NIC) to Virtual Machines on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM and libvirt
- PCI passthrough / PCI device assignment
- VFIO and vfio-pci
- IOMMU, Intel VT-d, and AMD-Vi
- virsh and virt-install
- dracut, grubby, lspci, and virt-host-validate

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Red Hat Enterprise Linux 9 documentation, "Managing virtual devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization
- libvirt Domain XML format documentation: https://libvirt.org/formatdomain.html
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html
- virt-install manual page: https://manpages.ubuntu.com/manpages/focal/en/man1/virt-install.1.html

## Issues Found
- The AMD IOMMU command suggested `amd_iommu=on iommu=pt`. Current RHEL 9 documentation states that AMD IOMMU is enabled by default and recommends adding `iommu=pt` for pass-through mode, so the AMD note was changed to `iommu=pt`.
- The IOMMU verification command used `dmesg | grep -i "IOMMU enabled"`, which is not reliable across RHEL boot logs. It was changed to `virt-host-validate | grep -i IOMMU`, matching Red Hat's documented validation workflow.
- The hostdev XML omitted the explicit `<driver name='vfio'/>` element shown in Red Hat's PCI and GPU assignment examples. The XML was updated to include it.
- The `virsh attach-device` example used positional arguments with `--config`. It was updated to use `--file` and `--persistent`, matching Red Hat's documented attach-device syntax for persistent VM configuration changes.
- The `virt-install` example used `--host-device 01:00.0`. RHEL guidance uses libvirt node device names from `virsh nodedev-list --cap pci`, so the example now uses `pci_0000_01_00_0` and notes how to retrieve it.

## Review Notes
The tutorial remains a concise generic passthrough guide. In a future expansion, it could mention that multi-function GPUs often require passing through companion functions such as HDMI audio, and that Red Hat documents GPU assignment as a secondary graphics device rather than as the primary emulated display replacement.
