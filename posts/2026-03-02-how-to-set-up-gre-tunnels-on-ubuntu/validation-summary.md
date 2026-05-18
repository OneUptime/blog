# Validation Summary: How to Set Up GRE Tunnels on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Generic Routing Encapsulation (GRE) protocol (RFC 2784/2890, IP protocol 47)
- Linux kernel modules: `gre`, `ip_gre`, `ip6_gre`
- iproute2 (`ip tunnel`, `ip link`, `ip addr`, `ip route`)
- tcpdump for traffic capture
- UFW (Uncomplicated Firewall)
- iptables
- systemd-networkd (`.netdev` and `.network` files)
- Netplan (tunnels configuration)
- Ubuntu ifupdown (`/etc/network/if-up.d/`)
- sysctl (`net.ipv4.ip_forward`)
- IPv6 GRE (`ip6gre`)

## Sources Consulted
- ip-tunnel(8) man page: https://www.man7.org/linux/man-pages/man8/ip-tunnel.8.html
- UFW Ubuntu manpage: https://manpages.ubuntu.com/manpages/focal/man8/ufw.8.html
- pcap-filter(7) man page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- Netplan documentation: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- systemd.netdev documentation (Tunnel/NetDev sections)
- LWN: Foo-over-UDP (FOU) article: https://lwn.net/Articles/614348/
- ip-fou(8) man page: https://man7.org/linux/man-pages/man8/ip-fou.8.html
- Red Hat Developer: Linux virtual interfaces — Tunnels: https://developers.redhat.com/blog/2019/05/17/an-introduction-to-linux-virtual-interfaces-tunnels

## Issues Found

1. **UFW protocol number syntax (incorrect).**
   Original: `sudo ufw allow proto 47 from 203.0.113.20 to 203.0.113.10`
   UFW does not accept numeric IP protocol numbers in `proto`. The accepted protocol names are `tcp`, `udp`, `ah`, `esp`, `ipv6`, `igmp`, `vrrp`, and `gre`. Changed to `proto gre`, which UFW supports directly.

2. **"GRE over UDP with `ip6gre`" — conflated two different mechanisms.**
   Original sentence said NAT-traversal workaround was "GRE over UDP with the `ip6gre`". `ip6gre` is GRE with IPv6 outer/transport headers (not UDP-encapsulated) and does not solve NAT traversal. The Linux mechanism that wraps GRE in UDP for NAT traversal is Foo-over-UDP (FOU). Updated the sentence to reference Foo-over-UDP (FOU) instead of `ip6gre`.

3. **`ip tunnel add ... mode ip6gre` — wrong address family.**
   Original: `sudo ip tunnel add gre6 mode ip6gre ...`
   Per ip-tunnel(8), modes for IPv4 encapsulation are `ipip`, `sit`, `isatap`, `vti`, `gre`. Modes for IPv6 encapsulation (`ip6ip6`, `ipip6`, `ip6gre`, `vti6`) require the `-6` flag. Changed to `sudo ip -6 tunnel add gre6 mode ip6gre ...`.

## Review Notes
- The 24-byte MTU overhead figure (20-byte outer IPv4 header + 4-byte GRE header) and the resulting 1476 tunnel MTU are correct.
- The `pmtudisc` option to `ip tunnel change` is correct syntax (it enables Path MTU Discovery). Note that with a fixed TTL (`ttl 255` as used in this guide) PMTU discovery is always on — the explicit `pmtudisc` is effectively a no-op when `ttl` is fixed, but the command is still valid.
- The tcpdump filter `proto gre` works on standard libpcap; the equivalent `gre` primitive or `proto 47` would also be valid alternatives.
- `iptables -p gre` works because `/etc/protocols` resolves the name `gre` to IP protocol 47.
- The startup script in `/etc/network/if-up.d/` is only invoked by the legacy ifupdown stack. On Ubuntu 18.04+ where Netplan is the default, this directory may not be hooked in unless ifupdown is installed and managing an interface; the systemd-networkd or Netplan options are more reliable on modern Ubuntu.
- `ip6_gre` is the more specific kernel module name for IPv6 GRE; loading just `ip_gre` is sufficient for the IPv4-transport examples that make up the bulk of the post.
- The `nf_conntrack_proto_gre` (and/or `nf_conntrack_pptp`) kernel module may be required for GRE packets to be tracked correctly by conntrack-based firewalls on kernels 3.18+; this isn't called out in the post but could be a useful future addition.
