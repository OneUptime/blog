# Validation Summary: How to Configure Virtual Machine Networking with libvirt on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM virtualization
- libvirt virtual networks
- virsh CLI
- NAT networking
- Isolated networking
- Bridged networking
- Linux bridge interfaces
- DHCP reservations
- iptables

## Sources Consulted
- libvirt Network XML format: https://libvirt.org/formatnetwork.html
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html
- libvirt Firewall and network filtering: https://libvirt.org/firewall.html
- Red Hat Enterprise Linux 9, Configuring virtual machine network connections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/configuring-virtual-machine-network-connections_configuring-and-managing-virtualization

## Issues Found
- The post stated that an isolated network has no connectivity to the host or external network. Red Hat and libvirt documentation state that isolated virtual networks do not pass traffic outside the host, but VMs can still communicate with the host and with other VMs on the same virtual network. Updated the isolated network description to reflect this.

## Review Notes
- The virsh commands, network XML examples, default NAT network details, DHCP reservation example, and troubleshooting commands are consistent with libvirt and RHEL documentation.
- The local environment did not include virsh, so virsh behavior was validated against the official libvirt manual rather than local command output.
