# Validation Summary: How to Configure SR-IOV for Virtual Machine Network Performance on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM and libvirt
- SR-IOV network virtual functions
- PCI passthrough and VFIO
- udev
- iproute2
- virt-install and virsh

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing SR-IOV devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization
- libvirt domain XML documentation, PCI passthrough network interface format: https://www.libvirt.org/formatdomain
- virt-install manual page, host device and import options: https://manpages.debian.org/trixie/virt-install/virt-install.1.en.html
- Local `ip link help` output for VF MAC and VLAN syntax

## Issues Found
- The AMD IOMMU command included `amd_iommu=on`. Red Hat's RHEL 9 SR-IOV documentation specifies `iommu=pt` for AMD hosts, so the command was changed to match the official RHEL 9 guidance.
- The persistence example used a systemd service. Red Hat's RHEL 9 SR-IOV procedure documents a udev rule using `ATTR{device/sriov_numvfs}`, so the example was changed to that supported persistence pattern. The driver name remains an example and must match the NIC driver in use.
- The virsh attachment example manually attached an XML device without setting a MAC address. Red Hat recommends `virsh attach-interface ... hostdev ... --mac ... --managed --live --config` for SR-IOV VF assignment to keep the interface configuration persistent and avoid guest network reconfiguration problems, so the example was updated.
- The virt-install example combined `--import` with `--disk size=20`, which creates an empty disk while `--import` is intended to create a VM around an existing bootable disk image. The disk option was changed to an existing qcow2 image path.

## Review Notes
- The throughput values are plausible examples, but real results depend on NIC model, driver, CPU, guest tuning, MTU, and workload. A future revision could label them explicitly as illustrative benchmark values.
- The udev rule's `ENV{ID_NET_DRIVER}=="ixgbe"` value is correct for the Intel 82599/X520 example but should be changed for other NIC families such as i40e, ice, mlx5_core, or bnxt_en.
