# Validation Summary: How to Set Up VLAN Tagging Over a Bonded Interface on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager and nmcli
- Linux network bonding
- 802.3ad/LACP
- 802.1Q VLAN tagging
- tcpdump, iproute2, and kernel bonding/VLAN status interfaces

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring VLAN tagging by using nmcli: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-vlan-tagging_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Configuring a network bond by using nmcli: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- NetworkManager nm-settings-nmcli reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local NetworkManager nmcli help output, version 1.46.0
- Linux kernel bonding documentation: https://docs.kernel.org/networking/bonding.html

## Issues Found
- The post used the RHEL 9.4+ `port-type` and `controller` nmcli syntax without noting the version requirement. Updated the prerequisite to say RHEL 9.4 or later.
- The bond activation instructions did not ensure all bond ports are activated when `bond0` is brought up. Added `nmcli connection modify bond0 connection.autoconnect-ports 1`, matching Red Hat's RHEL 9.4+ bond procedure.
- The base bond IPv6 example used `ipv6.method disabled`. Updated it to `ipv6.method ignore` to match Red Hat's documented recommendation for a bond parent used under VLAN interfaces.
- The post did not mention Red Hat's VLAN-on-bond caveat for `fail_over_mac=follow`. Added a short warning that this bond option should not be used when VLAN devices sit on top of the bond.

## Review Notes
The remaining nmcli VLAN creation commands, static IPv4 configuration commands, bond status checks, `/proc/net/vlan` verification, tcpdump VLAN filter, 8021q module checks, MTU guidance, and 802.3ad switch-side LACP requirement are technically valid for the documented RHEL 9.4+ scope. The `802-3-ethernet.mtu` setting name is accepted by NetworkManager; Red Hat examples often use the `ethernet.mtu` alias.
