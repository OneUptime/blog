# Validation Summary: How to Create and Manage Network Namespaces with ip netns on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux network namespaces
- iproute2 `ip netns`
- veth interfaces
- namespace-specific resolver configuration
- IPv4 forwarding and NAT with nftables

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring NAT using nftables: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters
- Red Hat Enterprise Linux 9 release notes: deprecated `iptables-nft` functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/deprecated_functionality
- `ip-netns(8)` man page on the review system
- `network_namespaces(7)` man page on the review system and man7.org: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- `veth(4)` man page on the review system and man7.org: https://man7.org/linux/man-pages/man4/veth.4.html
- `ip-link(8)` man page on the review system

## Issues Found
- The diagram showed `veth-blue` as `10.0.1.1`, but the later commands assign `10.0.1.1` to the host-side `veth-default` and `10.0.1.2` to `veth-blue`. Updated the diagram to match the working commands.
- The routing section said a default route lets the namespace reach outside if forwarding is enabled. Forwarding alone is not always sufficient; return routing or NAT is also required. Updated the comment to mention suitable routing or NAT.
- The DNS section said namespaces do not inherit `/etc/resolv.conf`. Network namespaces isolate networking state, not the filesystem view by themselves. `ip netns exec` can bind-mount files from `/etc/netns/NAME/` over their usual `/etc` paths for the executed command. Updated the wording to describe this accurately.
- The namespace identification example used `sudo ip netns identify 1` to check the current namespace, but PID 1 identifies the init process namespace, not necessarily the current shell. Replaced it with `ip netns identify $$`.
- The deletion section said deleting a namespace removes any interfaces inside it. That is true for veth devices, but physical devices are moved back to the initial namespace when the namespace is freed. Updated the comment to distinguish veth and physical interfaces.
- The practical example used `iptables` for masquerading. In RHEL 9, Red Hat documents `iptables-nft` as deprecated for new deployments and recommends `nft`. Replaced the NAT commands with nftables table, chain, and masquerade rule commands.
- The wrap-up said everything inside a namespace is completely isolated from the rest of the system. Network namespaces isolate the network stack specifically, while other resources require other namespace types. Updated the wording to refer to network-stack isolation.

## Review Notes
The tutorial is technically relevant and the core `ip netns`, veth, routing, DNS, monitoring, and service examples are valid after the corrections above. The nftables NAT example uses `ens192` as the outgoing interface because the article already uses that interface name in its diagram; readers must replace it with their actual internet-facing interface.
