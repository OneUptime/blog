# Validation Summary: How to Set Up Bridged Networking with libvirt on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager and nmcli
- libvirt and KVM
- virt-install
- Linux bridge networking
- macvtap
- firewalld
- Linux bridge netfilter sysctl settings

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a network bridge by using nmcli - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Enabling virtualization - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Configuring virtual machine network connections - https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/configuring-virtual-machine-network-connections_configuring-and-managing-virtualization
- libvirt Network XML format - https://www.libvirt.org/formatnetwork.html
- libvirt Domain XML format, network interfaces - https://libvirt.org/formatdomain.html
- libvirt macvtap host communication troubleshooting - https://wiki.libvirt.org/TroubleshootMacvtapHostFail.html
- firewalld firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- virt-install manual page - https://manpages.debian.org/bullseye/virtinst/virt-install.1.en.html

## Issues Found
- The prerequisites used `bridge-utils`, which is not needed for the NetworkManager and iproute2 commands shown in the post. Removed it from the package installation command.
- The prerequisites enabled the deprecated monolithic `libvirtd` service. Updated the command to enable and start the modular libvirt daemon sockets recommended for RHEL 9.
- The bridge port examples used older NetworkManager `master` syntax. Updated them to the current RHEL 9.4+ `port-type bridge` and `controller` syntax.
- The bridge activation sequence did not ensure bridge ports are brought up with the bridge. Added `connection.autoconnect-ports 1`, matching the current RHEL 9 NetworkManager bridge guidance.
- The macvtap `virt-install` example used the older `source_mode` suboption spelling. Updated it to the current `source.mode` spelling documented by current virt-install man pages.

## Review Notes
The examples assume a wired Ethernet interface. RHEL documentation notes that standard Linux bridging is not supported over Wi-Fi interfaces operating in common infrastructure or ad-hoc modes. The hardcoded example connection name `Wired connection 1` may need to be replaced on real hosts, and the post now calls that out inline.
