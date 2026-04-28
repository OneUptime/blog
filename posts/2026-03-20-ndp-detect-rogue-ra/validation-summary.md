# Validation Summary: How to Detect Rogue Router Advertisements on IPv6 Networks

## Status
validated

## Post Type
Tutorial / Guide (operational how-to for detecting rogue IPv6 Router Advertisements)

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP, RFC 4861)
- ICMPv6 Router Advertisement (Type 134)
- `tcpdump` BPF filters for IPv6/ICMPv6
- Python Scapy (`scapy.all`, `IPv6`, `ICMPv6ND_RA`)
- NDPMon (NDP monitoring daemon)
- `ip6tables` (LOG / hashlimit modules)
- `iproute2` (`ip -6 route`)

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
  - §4.2 Router Advertisement Message Format (RouterLifetime is a 16-bit unsigned int, max 65535)
  - §6.2.1 AdvDefaultLifetime (must be 0 or between MaxRtrAdvInterval and 9000s)
- NDPMon upstream config in Debian: https://sources.debian.org/src/ndpmon/1.4.0-2.1/config_ndpmon.xml
- NDPMon Debian install paths: https://sources.debian.org/src/ndpmon/1.4.0-2.1/debian/ndpmon.install
- Scapy ICMPv6ND_RA API: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- radvd `radvd.conf(5)` manual (MaxRtrAdvInterval default 600s): https://manpages.debian.org/radvd.conf
- Cisco IOS IPv6 Implementation Guide (RA send interval default 200s on `show ipv6 interface`)
- iptables / ip6tables `--icmpv6-type` extension documentation

## Issues Found

1. **Wrong NDPMon config schema** — The post's example `cat /etc/ndpmon.xml` used a root element `<ndpmon>`, listed the router's link-local address inside `<address>`, and placed `<prefix>` as a flat element directly under `<router>`. None of this matches NDPMon's actual config DTD: the root is `<config_ndpmon>`, the router link-local element is `<lla>` (the `<address>` element is reserved for the prefix address inside `<prefix>`), and prefixes live inside a `<prefixes>` wrapper. A user copying the post's XML verbatim would get parse errors. Fixed the example to use `<config_ndpmon>`, `<lla>`, and the proper `<prefixes><prefix><address>…</address><mask>…</mask></prefix></prefixes>` structure. Also corrected the config file path from `/etc/ndpmon.xml` to `/etc/ndpmon/config_ndpmon.xml`, which is what the Debian/Ubuntu `ndpmon` package actually installs.

2. **Default RA interval claim was Cisco-specific without qualification** — The post stated "Routers send RA every 200 seconds (default)". 200s is the Cisco IOS default, but radvd (the most common Linux router-advertisement daemon) defaults to MaxRtrAdvInterval=600s, and RFC 4861 specifies no single universal default. Reworded to "every ~200-600 seconds (Cisco IOS default 200s, radvd default 600s)" so readers don't mistakenly flag a 600s interval as anomalous on Linux-based routers.

## Review Notes

- **`RouterLifetime=65535`**: Verified correct as an attacker indicator. The field is a 16-bit unsigned integer per RFC 4861 §4.2 with max on-the-wire value 65535. RFC 4861 §6.2.1 requires legitimate senders to use 0 or a value in `[MaxRtrAdvInterval, 9000]`, so 65535 is a clear spec violation and a known rogue-RA tactic.
- **`RouterLifetime=0` invalidation attack**: Correct. RFC 4861 §6.3.4 says a host that receives an RA with Router Lifetime=0 from one of its default routers MUST remove that router from the Default Router List. An attacker can use a spoofed lifetime=0 RA to evict a legitimate router, matching the post's description.
- **tcpdump filter `icmp6 and ip6[40] == 134`**: Works only when there are no IPv6 extension headers preceding ICMPv6, which is true for virtually all Router Advertisements seen in practice (RAs are link-local and almost never carry extension headers). For more general use `icmp6 and icmp6[0] == 134` would also work; the post's filter is acceptable.
- **Scapy `ICMPv6ND_RA.routerlifetime`**: Verified — field name is exactly `routerlifetime` (lowercase, no underscore), default 1800. Code is correct as-is.
- **`ip6tables --icmpv6-type router-advertisement`**: Verified valid keyword in the iptables ICMPv6 type table.
- **`ip -6 route del default via fe80::bad dev eth0`**: Correct syntax — `dev` is required when the gateway is a link-local address since the scope is otherwise ambiguous.
- **awk `systime()`**: Note that `systime()` is a gawk extension, not POSIX awk. On Linux this is fine because `awk` is gawk by default, but on minimal BusyBox-based systems this would not work. Acceptable for the post's audience.
- **NDPMon config example is still simplified**: The fix above moves the schema closer to upstream, but a complete production-ready `<router>` block in NDPMon's config also includes `<param_curhoplimit>`, `<param_router_lifetime>`, `<param_volatile>`, etc. The example as fixed is parseable as a starting point and matches the post's "Example configuration:" framing without the previous outright-wrong elements.
