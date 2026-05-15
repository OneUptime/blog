# Validation Summary: How to Configure Network Namespaces for Isolated Networking on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux network namespaces
- iproute2 (`ip netns`, `ip link`, `ip addr`, `ip route`)
- Virtual Ethernet (`veth`) pairs
- nftables NAT masquerading
- Linux IPv4 forwarding

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Linux man-pages: network_namespaces(7), https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux man-pages: ip-netns(8), https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Local iproute2 help output for `ip netns` and `ip link`
- Local nftables man page and `nft --help` output

## Issues Found
- The original NAT example used `iptables -t nat ... MASQUERADE`. On current RHEL documentation, `nftables` is the recommended packet-filtering framework for this type of rule, and the `iptables` nft variants are deprecated in RHEL 9. I replaced the command with equivalent `nft` commands that create an IPv4 NAT table, add a postrouting source NAT chain, and masquerade traffic from `10.0.0.0/24`.
- The original NAT example hard-coded `ens192` without explanation. I updated the comment to state that it should be replaced with the host's outbound interface.

## Review Notes
The namespace, veth, addressing, route, loopback, ping, and cleanup commands match current `iproute2` syntax. The nftables rules are runtime rules; a future improvement could mention making them persistent or using `firewalld` if that is the host's active firewall manager.
