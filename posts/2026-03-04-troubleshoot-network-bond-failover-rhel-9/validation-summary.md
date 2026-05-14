# Validation Summary: How to Troubleshoot Network Bond Failover Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux bonding driver
- NetworkManager and nmcli
- MII and ARP link monitoring
- LACP / IEEE 802.3ad bonding
- Gratuitous ARP and neighbor tables
- journalctl, tcpdump, ethtool, ping, and iproute2

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking, "Configuring a network bond by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Linux kernel Ethernet Bonding Driver HOWTO: https://docs.kernel.org/networking/bonding.html
- NetworkManager nm-settings-nmcli reference for `bond.options`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local `nmcli(1)` and `nm-settings-nmcli(5)` man pages
- Local `ping(8)`, `ip-neighbour(8)`, and `tcpdump` command help output

## Issues Found
- The post said that `miimon=0` means no link monitoring happens. Changed this to no MII link monitoring, because ARP monitoring can still be used separately.
- The post described gratuitous ARP as notifying switches that the MAC address moved. Updated the explanation to say the bond sends peer notifications, including gratuitous ARP for IPv4 addresses, so peers can refresh neighbor information and switches can learn traffic from the MAC on the new port.
- The post used `nmcli device disconnect eth0` as a failover test without caveat. Clarified that this is a configuration-level failover test and that real link failure testing requires physically disconnecting the active NIC, matching Red Hat's guidance that software deactivation does not properly test link failure events.
- The post said `primary_reselect=failure` only uses the primary on initial boot. Corrected this to the kernel behavior: the primary becomes active when initially enslaved, or when the current active slave fails while the primary is up.

## Review Notes
The commands and bonding options are otherwise valid for RHEL 9 with NetworkManager. The examples assume the connection profile is named `bond0` and that interface names such as `eth0` and `eth1` match the local system; on many RHEL 9 hosts predictable names such as `enp7s0` are more common.
