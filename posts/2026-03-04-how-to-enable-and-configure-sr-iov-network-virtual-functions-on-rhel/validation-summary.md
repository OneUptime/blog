# Validation Summary: How to Enable and Configure SR-IOV Network Virtual Functions on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SR-IOV network virtual functions
- Linux IOMMU kernel parameters
- iproute2 `ip link`
- udev rules
- systemd services
- libvirt / virsh PCI host device assignment

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing SR-IOV devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization
- libvirt virsh manual, `attach-interface`: https://www.libvirt.org/manpages/virsh.html
- libvirt Domain XML format, PCI passthrough network interfaces: https://www.libvirt.org/formatdomain
- Linux kernel command-line parameter documentation: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Local `ip link help` output for VF attributes such as `mac`, `vlan`, `max_tx_rate`, and `spoofchk`

## Issues Found
- The AMD IOMMU command used `amd_iommu=on iommu=pt`. RHEL 9 documents `iommu=pt` for AMD hosts, while the Linux kernel documentation lists AMD IOMMU driver values such as `off`, `fullflush`, and `force_isolation`, not `on`. Changed the AMD example to `sudo grubby --update-kernel=ALL --args="iommu=pt"`.
- The `virsh attach-interface` example was labeled as attaching a VF to a running VM but did not include `--live`, leaving behavior to libvirt's legacy default. Updated it to include `--live --config`, matching Red Hat's SR-IOV procedure for hot-plugging a VF and making the change persistent.
- Added `--mac` to the `virsh attach-interface` example, matching Red Hat's documented SR-IOV example and avoiding guest network reconfiguration caused by an unexpected generated MAC address.

## Review Notes
- The udev persistence rule is consistent with Red Hat's documented SR-IOV example, but the `ID_NET_DRIVER` value must match the actual PF driver on the target host.
- Red Hat notes that to modify PF configuration after VFs exist, the VF count must first be set to zero and any assigned VFs must be removed from guests.
- SR-IOV VF assignment has operational limitations, including lack of normal live migration for VFIO-assigned devices and increased memory pinning requirements.
