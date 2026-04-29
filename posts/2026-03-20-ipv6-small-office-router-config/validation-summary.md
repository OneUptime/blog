# Validation Summary: How to Configure IPv6 on a Small Office Router

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- Linux `iproute2` networking commands
- VLAN interfaces on Linux
- Router Advertisements with `radvd`
- DHCPv6 and SLAAC
- IPv6 firewalling with `ip6tables` / Netfilter
- Packet capture with `tcpdump`

## Sources Consulted
- Linux `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `radvd.conf(5)` manual: https://manpages.debian.org/bookworm/radvd/radvd.conf.5.en.html
- Linux kernel IPv6 sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `iptables-extensions(8)` manual: https://manpages.debian.org/unstable/iptables/iptables-extensions.8.en.html
- RFC 3849, IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4861, Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8415, DHCPv6: https://datatracker.ietf.org/doc/html/rfc8415
- ISC Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/kea-2.6.3/arm/dhcp6-srv.html
- Local CLI help checked: `ip link help vlan`, `ip -6 address help`, `ip6tables -m conntrack -h`

## Issues Found
- The delegated prefix in the network diagram was inconsistent with the `/64` examples. `2001:db8::/48` does not contain `2001:db8:1:10::/64`, so I corrected the delegated prefix to `2001:db8:1::/48`.
- The original guide configured VLAN interfaces and firewall rules but did not enable IPv6 forwarding on the Linux router. I added `sysctl -w net.ipv6.conf.all.forwarding=1` because forwarding is required for the router to pass IPv6 traffic between VLANs and to the WAN.
- The post claimed the server VLAN used stateful DHCPv6, but the original `radvd` snippet only set RA flags. I added a minimal Kea DHCPv6 server example and a DHCPv6 verification capture so the configuration now matches the claim.
- The firewall example used the legacy `state` matcher. I updated it to `-m conntrack --ctstate ESTABLISHED,RELATED`, which is the current match extension documented by iptables.
- The description and introduction implied the post showed WAN-side ISP prefix delegation configuration even though it only covered LAN-side use of an already delegated prefix. I narrowed the wording and explicitly stated that the WAN-side delegated prefix is assumed to already be available.
- The employee VLAN comment suggested the router itself "encouraged" privacy addresses. I corrected the wording to reflect that privacy addressing is host behavior alongside SLAAC, not something `radvd` directly enforces.

## Review Notes
- `ip6tables` remains valid, but many modern Linux distributions use the nftables backend or prefer native `nft` rulesets for new deployments.
- If the WAN interface learns its default IPv6 route via Router Advertisements, a Linux router with forwarding enabled commonly also needs `net.ipv6.conf.<wan>.accept_ra=2` on that WAN interface. This post now scopes itself to the LAN side and assumes WAN-side IPv6 provisioning is already working.
- The `RDNSS` addresses that use the documentation prefix are example values. In a live deployment they must point to reachable recursive DNS servers.
