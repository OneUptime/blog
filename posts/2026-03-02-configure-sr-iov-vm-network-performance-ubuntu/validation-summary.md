# Validation Summary: How to Configure SR-IOV for VM Network Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel IOMMU and PCI SR-IOV
- KVM/QEMU
- libvirt and virsh
- VFIO PCI passthrough
- iproute2 network interface configuration
- systemd services
- iperf3 performance testing

## Sources Consulted
- Linux kernel PCI Express I/O Virtualization Howto: https://docs.kernel.org/PCI/pci-iov-howto.html
- Linux kernel command-line parameters: https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- ip-link(8) Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- libvirt domain XML format: https://libvirt.org/formatdomain.html
- libvirt PCI addresses in domain XML and guest OS: https://libvirt.org/pci-addresses.html
- Ubuntu Server documentation for libvirt device passthrough: https://ubuntu.com/server/docs/how-to/virtualisation/libvirt/
- QEMU VirtIO devices documentation: https://www.qemu.org/docs/master/system/devices/virtio/index.html

## Issues Found
- The AMD GRUB example used `amd_iommu=on`, which is not a documented value in the current Linux kernel command-line parameter reference. Changed the AMD example to use `iommu=pt`, after firmware-level AMD-Vi/IOMMU enablement.
- The persistent SR-IOV setup script wrote a non-zero value directly to `sriov_numvfs` even if VFs were already active. The kernel SR-IOV sysfs interface requires disabling existing VFs before changing the VF count, so the script now checks the current count, disables existing VFs when needed, and only writes the requested count when it differs.
- The VF PCI address listing used `ls` while showing symlink targets in the expected output. Changed the command to `ls -l` so the displayed `virtfnN -> ../0000:...` output matches the command.
- The script comment claimed VF trust mode was for better performance. `ip link` documents trust mode as allowing trusted VF features that may affect security or performance, so the comment now describes it as enabling trusted VF features when needed.
- The performance section gave a fixed `~10-20%` virtio overhead expectation. Replaced it with a workload-dependent note because virtio networking can use different backends such as vhost and performance varies by configuration and host CPU capacity.

## Review Notes
The libvirt `hostdev` and `interface type='hostdev'` XML examples match current libvirt documentation. The `ip link` VF options used in the post are current, but support for options such as `trust`, `spoofchk`, and rate limiting depends on the NIC driver and firmware.
