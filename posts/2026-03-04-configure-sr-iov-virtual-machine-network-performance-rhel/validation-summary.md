# Validation Summary: How to Configure SR-IOV for Virtual Machine Network Performance on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM virtualization
- libvirt and virsh
- SR-IOV network device assignment
- Linux PCI and IOMMU configuration
- systemd
- iproute2
- iperf3

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing SR-IOV devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation, "Attaching SR-IOV networking devices to virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization#attaching-sr-iov-networking-devices-to-virtual-machines_managing-virtual-devices
- libvirt domain XML documentation, PCI passthrough and hostdev interfaces: https://www.libvirt.org/formatdomain.html

## Issues Found
- The AMD IOMMU boot parameter example used `amd_iommu=on iommu=pt`. RHEL 9 documentation states that AMD hosts should use `iommu=pt` for this SR-IOV workflow, so the AMD comment was updated.
- The IOMMU verification command looked only for the exact phrase `IOMMU enabled`, which is not a reliable RHEL kernel log pattern. It now checks for `DMAR` or `IOMMU` messages.
- The SR-IOV capability check only listed Ethernet devices. RHEL documentation recommends checking `lspci -v` output for the `Single Root I/O Virtualization` capability, so the command was updated.
- The VM assignment example manually created an interface hostdev XML and attached it with `virsh attach-device`. RHEL documentation recommends `virsh attach-interface ... hostdev ... --mac ... --managed --live --config` for SR-IOV network VFs, and warns that manually adding hostdev entries can make guest network settings need reconfiguration after host reboot. The example was updated accordingly.

## Review Notes
The post is technically relevant and the remaining commands are consistent with RHEL/libvirt SR-IOV workflows. The systemd persistence example can work on typical systems, though Red Hat's documented example uses a udev rule for persistent VF creation.
