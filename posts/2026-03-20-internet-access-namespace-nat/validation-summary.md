# Validation Summary: How to Provide Internet Access to a Network Namespace Using NAT

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- `iproute2` (`ip netns`, `ip link`, `ip route`)
- veth pairs
- IPv4 forwarding (`sysctl`)
- Netfilter NAT with `iptables`
- Netfilter NAT and filtering with `nftables`
- DNS configuration for named network namespaces
- Docker bridge networking comparison

## Sources Consulted
- `ip-netns(8)`: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `network_namespaces(7)`: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- `veth(4)`: https://man7.org/linux/man-pages/man4/veth.4.html
- `ip-link(8)`: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-route(8)`: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel IP sysctl docs: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `iptables(8)`: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)`: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables NAT documentation: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29
- nftables hook priorities: https://wiki.nftables.org/wiki-nftables/index.php/Netfilter_hooks
- nftables conntrack state matching: https://wiki.nftables.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation
- Docker firewall behavior: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker iptables behavior: https://docs.docker.com/engine/network/firewall-iptables/

## Issues Found
- The introduction and description said masquerading translates traffic to the host's "public IP". I changed this to the address on the host's outbound interface, which is what MASQUERADE actually uses.
- The post omitted forwarding/filter rules. NAT and `net.ipv4.ip_forward=1` are not always sufficient when the host firewall drops forwarded traffic, so I added matching `iptables` and `nftables` forward rules and updated the full setup script accordingly.
- The conclusion said the setup was "exactly" what Docker uses. I corrected this to say it is the same basic pattern, while noting that Docker uses a Linux bridge and additional firewall rules.

## Review Notes
- The commands and examples are valid for IPv4 namespace egress through a host interface.
- The `ip netns` DNS example using `/etc/netns/ns1/resolv.conf` is correct for named namespaces.
- `MASQUERADE` is a reasonable choice for a generic tutorial, though `SNAT` can be more explicit on hosts with a stable static egress address.
