# Validation Summary: How to Configure Network Namespaces for Isolated Networking on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Linux network namespaces
- iproute2 `ip netns`, `ip link`, `ip addr`, and `ip route`
- Virtual Ethernet (`veth`) pairs
- IPv4 forwarding
- nftables NAT masquerading

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters, nftables NAT and masquerading: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters
- Red Hat Enterprise Linux 9 documentation: iptables and iptables-nft deprecation notice: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Linux man-pages: network_namespaces(7): https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux man-pages: veth(4): https://man7.org/linux/man-pages/man4/veth.4.html
- Local `iproute2` command help output for `ip netns` and `ip link`

## Issues Found
- The post used `iptables` for NAT masquerading. On RHEL 9, Red Hat documents `iptables` and `iptables-nft` as deprecated and recommends migrating to the `nft` command from nftables. I replaced the `iptables -t nat ... MASQUERADE` command with nftables table, `prerouting` chain, `postrouting` chain, and masquerade rule commands.
- The original NAT example used `eth0`, which is not a reliable interface name on RHEL 9 systems. I changed the example to use `ens3`, matching Red Hat's nftables masquerading examples. Readers should still adjust this to their actual outbound interface.

## Review Notes
The namespace creation, listing, command execution, veth pair creation, moving one veth peer into a namespace, address assignment, loopback activation, connectivity tests, default route, and namespace deletion commands are technically correct for Linux network namespaces on RHEL 9. The nftables NAT commands are suitable for a simple example, but persistent firewall configuration and coexistence with firewalld would need additional handling in a production guide.
