# Validation Summary: How to Create a Network Bridge for KVM Virtual Machines on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/QEMU virtualization
- libvirt and virsh
- NetworkManager and nmcli
- Linux bridge networking
- virt-install
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring a network bridge by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Configuring virtual machine network connections": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/configuring-virtual-machine-network-connections_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- NetworkManager nm-settings/nmcli reference for connection controller, port, and autoconnect properties: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- libvirt network XML format documentation: https://libvirt.org/formatnetwork.html
- libvirt domain XML interface documentation: https://libvirt.org/formatdomain.html

## Issues Found
- The bridge port command used older NetworkManager `master` terminology. Updated the primary command to the current RHEL 9.4+ `port-type bridge` and `controller br0` syntax, and kept a commented fallback for RHEL 9.3 or earlier.
- The activation step only brought up the bridge profile. Red Hat documentation notes that activating a bridge does not necessarily activate all ports unless port autoconnect is enabled. Added `connection.autoconnect-ports 1`, the older `connection.autoconnect-slaves` fallback comment, and an explicit `nmcli connection up br0-port`.
- The `virt-install` example used `--network bridge=br0` immediately after defining a libvirt network named `br0-network`. Direct bridge attachment is valid, but it bypasses the libvirt network created in the previous step. Updated the example to use `--network network=br0-network`.
- Updated remaining "slave"/"enslaved" wording to "port" where it described NetworkManager bridge port behavior.

## Review Notes
The static IP examples use placeholder addresses and must be adjusted for the reader's LAN. The post correctly warns that changing the active management interface can interrupt connectivity. Wi-Fi bridge limitations are not covered, but that omission does not make the Ethernet bridge procedure incorrect.
