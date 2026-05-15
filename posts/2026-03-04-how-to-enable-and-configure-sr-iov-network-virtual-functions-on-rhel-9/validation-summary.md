# Validation Summary: How to Enable and Configure SR-IOV Network Virtual Functions on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SR-IOV network virtual functions
- Linux IOMMU kernel parameters
- udev rules
- libvirt and virsh
- iproute2

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing virtualization", Chapter 14, Managing SR-IOV devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization
- libvirt virsh manual, attach-interface command: https://www.libvirt.org/manpages/virsh.html
- Linux ip-link(8) manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html

## Issues Found
- The IOMMU command used Intel-specific `intel_iommu=on` without showing the RHEL 9 AMD form. Added separate Intel and AMD examples; Red Hat documents `intel_iommu=on iommu=pt` for Intel hosts and `iommu=pt` for AMD hosts.
- The VM assignment example manually detached the VF and then used `virsh attach-interface` with a shortened PCI address and `--model virtio`. For SR-IOV hostdev assignment, Red Hat documents `virsh attach-interface <vm_name> hostdev <domain:bus:slot.function> --managed --live --config`, and libvirt documents `--managed` for hostdev interfaces. Replaced the example with a full PCI address, `--managed`, and `--live --config`.

## Review Notes
- The udev rule shown is consistent with Red Hat's documented persistent VF creation pattern, but the driver name and number of VFs must be adjusted for the actual NIC.
- The `ip link set eth0 vf 0 mac ...` and `ip link set eth0 vf 0 vlan ...` examples are syntactically valid, but hardware and driver support for individual VF settings can vary.
