# Validation Summary: How to Configure IPv6 Accept RA on Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Linux kernel IPv6 networking stack
- `accept_ra` sysctl parameter (`net.ipv6.conf.<iface>.accept_ra`)
- ICMPv6 Router Advertisement (RFC 4861) and SLAAC (RFC 4862)
- `sysctl` / `/etc/sysctl.d/` configuration
- `iproute2` (`ip -6 route`, `ip -6 addr`, `ip link`)
- `tcpdump` BPF filter for ICMPv6 type 134
- `rdisc6` / `ndisc6` (ndisc6 package by Rémi Denis-Courmont)

## Sources Consulted
- Linux kernel docs: Documentation/networking/ip-sysctl.rst (accept_ra, accept_ra_defrtr, autoconf, forwarding semantics)
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6) — Router Solicitation (type 133) / Router Advertisement (type 134)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration
- ndisc6 / rdisc6 upstream documentation (https://www.remlab.net/ndisc6/) — `rdisc6` is the Router Solicitation tool; `ndisc6` is the Neighbor Solicitation tool (analogous to IPv4 arping)
- systemd `sysctl.d(5)` and `sysctl --system` behavior
- Live verification: `/proc/sys/net/ipv6/conf/default/accept_ra` returned `1`, confirming the documented host default

## Issues Found
1. **Incorrect tool listed for soliciting an RA.** The "Testing RA Reception" section listed `ndisc6 fe80::1 eth0` as an alternative to `rdisc6 eth0` for sending a Router Solicitation. `ndisc6` sends ICMPv6 Neighbor Solicitations (the IPv6 equivalent of `arping`) — it does not send Router Solicitations and will not cause a router to emit an RA. Fix: removed the `# or` / `ndisc6 ...` lines so only the correct tool (`rdisc6`) remains.
2. **Misleading terminology — "router-on-a-stick".** The comment described `accept_ra=2` as "for router-on-a-stick". Router-on-a-stick is unrelated (it refers to inter-VLAN routing through sub-interfaces on a single trunk port). The actual use case for `accept_ra=2` is a forwarding router/CPE that needs to learn its default route from an upstream router via RA. Fix: rewrote the comment to "for routers that need to learn a default route from upstream".

## Review Notes
- The three-value semantics of `accept_ra` (0/1/2) and the "host default = enabled when forwarding is disabled" behavior are consistent with the kernel `ip-sysctl` documentation.
- The tcpdump filter `'icmp6 and (ip6[40] == 134)'` is correct: byte 40 of an IPv6 packet is the first byte of the next header (here ICMPv6), which carries the Type field; type 134 is RA. A more readable equivalent is `icmp6[icmp6type] == icmp6-router-advertisement`, but the form used works.
- The two `cat > /etc/sysctl.d/60-ipv6-accept-ra.conf` blocks in "Persistent Configuration" both write to the same filename. They are clearly meant as alternative scenarios, not sequential commands; this is a stylistic choice rather than a technical error, so left as-is per the "only fix technical errors" rule.
- For completeness, related sysctls a future revision could mention: `accept_ra_defrtr` (whether to install a default route from RA), `accept_ra_pinfo` (whether to honor Prefix Information options), `accept_ra_rt_info_max_plen` (route-info option handling), and `autoconf` (which gates SLAAC address generation independently of `accept_ra`). The post correctly notes that SLAAC requires `autoconf=1` in addition to RA acceptance.
- No version-specific caveats: behavior described matches mainline Linux kernels in current LTS series.
