# Validation Summary: How to Configure Virtual Machine Networking (Bridge, NAT, macvtap) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 virtualization
- KVM and libvirt virtual networking
- NAT networking with libvirt default network
- Linux bridge networking with NetworkManager and nmcli
- macvtap direct networking
- virsh and virt-install CLI usage

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring virtual machine network connections - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/configuring-virtual-machine-network-connections_configuring-and-managing-virtualization
- libvirt Network XML format - https://libvirt.org/formatnetwork.html
- libvirt Domain XML format, network interfaces and direct attachment - https://libvirt.org/formatdomain.html
- virt-install manual page, networking options - https://manpages.debian.org/testing/virt-install/virt-install.1.en.html
- Local nmcli help output from NetworkManager 1.46.0

## Issues Found
- The bridge port command used `type bridge-slave`. While still accepted by nmcli, Red Hat's RHEL 9 documentation uses the current `type ethernet slave-type bridge` form for bridge ports. Updated the command accordingly.
- The bridge activation example did not configure NetworkManager to activate bridge ports automatically. Added `connection.autoconnect-ports 1`, matching the RHEL 9 bridge guidance.
- The macvtap `virt-install` example used `source_mode=bridge`. Current virt-install documentation uses `source.mode=bridge`, so the example was updated to the current option spelling.
- The comparison described macvtap as best for simple setups. Red Hat recommends replacing macvtap with Linux bridge networking unless macvtap is explicitly required, so the wording was changed to narrow the recommendation.

## Review Notes
- The libvirt network XML for using an existing host bridge matches the upstream libvirt and Red Hat examples.
- The default NAT network behavior, `virbr0`, and the typical `192.168.122.0/24` subnet match libvirt documentation.
- macvtap still has the important host-to-VM communication limitation noted in the post.
