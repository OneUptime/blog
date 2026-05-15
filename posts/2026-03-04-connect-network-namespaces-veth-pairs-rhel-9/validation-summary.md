# Validation Summary: How to Connect Network Namespaces Using veth Pairs on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- Linux network namespaces
- veth pairs
- Linux bridge interfaces
- iproute2 commands: `ip`, `bridge`
- nftables NAT and forwarding rules
- `ethtool`
- `tcpdump`

## Sources Consulted
- Linux `veth(4)` manual page: https://man7.org/linux/man-pages/man4/veth.4.html
- Linux `ip-netns(8)` manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `bridge(8)` manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- Red Hat Enterprise Linux 9 release notes, deprecated networking functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/deprecated_functionality
- Red Hat Enterprise Linux 9 firewall and packet filter documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- Local command help/version output for `iproute2`, `iptables`, `nft`, `ethtool`, and `bridge`

## Issues Found
- The Internet access section used `iptables` commands. In RHEL 9, Red Hat deprecates the `iptables-nft` package and recommends `nft` for new deployments. Replaced the NAT and forwarding examples with equivalent runtime `nftables` commands.

## Review Notes
The namespace, veth, bridge, MTU, inspection, monitoring, and cleanup examples are consistent with the Linux manual pages and local `iproute2` command syntax. The firewall rules shown are runtime examples; production RHEL systems commonly use persistent `nftables` scripts or `firewalld` configuration.
