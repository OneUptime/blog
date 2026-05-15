# Validation Summary: How to Enable and Configure SR-IOV Virtual Functions on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SR-IOV networking
- PCI passthrough and VFIO
- libvirt / virsh
- udev
- systemd
- Linux iproute2

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Configuring and managing Linux virtual machines, "Managing SR-IOV networking devices" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_managing_linux_virtual_machines/configuring_and_managing_linux_virtual_machines
- Red Hat Enterprise Linux 7 documentation: Virtualization Deployment and Administration Guide, "PCI Device Assignment with SR-IOV Devices" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_deployment_and_administration_guide/sect-pci_devices-pci_passthrough
- Linux kernel documentation: PCI Express I/O Virtualization Howto - https://docs.kernel.org/PCI/pci-iov-howto.html
- libvirt documentation: Domain XML format - https://libvirt.org/formatdomain.html
- libvirt documentation: virsh attach-device command - https://www.libvirt.org/manpages/virsh.html
- Local iproute2 CLI help: `ip link help`

## Issues Found
- The IOMMU verification example said the output should show `DMAR: IOMMU enabled`, which is Intel-specific. Changed the command and comment to account for Intel DMAR and AMD-Vi/IOMMU messages.
- The Intel kernel command line omitted `iommu=pt`, which Red Hat documents alongside `intel_iommu=on` for current RHEL virtualization guidance. Added `iommu=pt`.
- The AMD kernel command line used `amd_iommu=on`; current Red Hat guidance for AMD hosts documents `iommu=pt` because AMD-Vi is enabled by default on current RHEL releases. Updated the example comment.
- The libvirt VM assignment example used a generic `<hostdev>` PCI device. That is valid for passthrough, but Red Hat and libvirt document `<interface type='hostdev'>` for SR-IOV NICs when network-specific settings such as MAC address need to be preserved. Updated the XML example accordingly.

## Review Notes
The remaining commands are hardware- and driver-dependent but align with Red Hat, Linux kernel, libvirt, and iproute2 documentation. Some VF properties such as rate limiting and trust/spoof-check behavior may vary by NIC driver and firmware.
