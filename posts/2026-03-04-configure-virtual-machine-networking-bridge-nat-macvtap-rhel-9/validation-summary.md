# Validation Summary: How to Configure Virtual Machine Networking (Bridge, NAT, macvtap) on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM virtualization
- libvirt virtual networks and domain interface XML
- NetworkManager and nmcli
- nftables
- Linux bridges
- macvtap

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring virtual machine network connections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/configuring-virtual-machine-network-connections_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Configuring a network bridge by using nmcli: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Configuring destination NAT using nftables: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters
- libvirt Domain XML format documentation: https://libvirt.org/formatdomain.html
- libvirt Network XML format documentation: https://libvirt.org/formatnetwork.html

## Issues Found
- The introduction described NAT, bridge, and macvtap as the three primary RHEL 9 VM networking modes. RHEL 9 documents additional virtual network modes and connection types, so the wording was changed to call these three common options.
- The nftables DNAT example added a prerouting rule without showing the required NAT table and NAT chains. The example was updated to create the `ip nat` table, `prerouting` chain, and `postrouting` chain before adding the DNAT rule.
- The bridge setup used `type bridge-slave` and `master`. Current RHEL 9 documentation for RHEL 9.4 and later uses Ethernet bridge ports with `port-type bridge` and `controller`, so the command was updated.
- The macvtap advantages listed "Good performance." Red Hat documents macvtap as supported but notes that it has suboptimal performance compared with other available VM networking configurations. The advantage was changed to direct attachment to the physical network interface.
- The summary implied macvtap was generally preferable for performance/functionality trade-offs. It now notes Red Hat's recommendation to use a Linux bridge instead of macvtap bridge mode unless macvtap is explicitly required.

## Review Notes
The updated nmcli bridge-port syntax follows current RHEL 9.4+ documentation. Earlier RHEL 9 minor releases used `slave-type`, `master`, and related terminology, so older systems may require the legacy form.
