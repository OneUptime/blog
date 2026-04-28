# Validation Summary: How to Configure NDP Proxy for IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv6 / Neighbor Discovery Protocol (NDP)
- Linux kernel (`net.ipv6.conf.<iface>.proxy_ndp` sysctl)
- iproute2 (`ip -6 neigh`, `ip link`, `bridge link`)
- ndppd (NDP Proxy Daemon by Daniel Adolfsson)
- Linux bridge with VXLAN overlay and `neigh_suppress`
- tcpdump BPF filters for ICMPv6
- systemd (service management for ndppd)

## Sources Consulted
- RFC 4389 — Neighbor Discovery Proxies (ND Proxy)
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6) — NS = type 135, NA = type 136
- Linux kernel `Documentation/networking/ip-sysctl.txt` — `proxy_ndp` BOOLEAN
- iproute2 `ip-neighbour(8)` manpage — https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- iproute2 `bridge(8)` manpage — https://man7.org/linux/man-pages/man8/bridge.8.html
- ndppd canonical source and `ndppd.conf-dist` — https://github.com/DanielAdolfsson/ndppd
- ndppd.conf(5) Debian manpage — https://manpages.debian.org/bookworm/ndppd/ndppd.conf.5.en.html
- pcap-filter(7) — https://www.tcpdump.org/manpages/pcap-filter.7.html

## Issues Found

1. **Invalid `neigh_suppress` syntax in the VXLAN section.** The post used `ip link set br100 type bridge neigh_suppress on`, but `neigh_suppress` is a per-port (bridge slave) attribute (`IFLA_BRPORT_NEIGH_SUPPRESS`), not a bridge-level attribute. The valid form is `bridge link set dev <port> neigh_suppress on` applied to a slave interface. Rewrote the example to attach a VXLAN port to the bridge and set `neigh_suppress` on that port via `bridge link set`.

2. **`bridge link show` does not display `neigh_suppress` by default.** The verification line needed the `-d` (details) flag. Changed `bridge link show | grep neigh_suppress` to `bridge -d link show | grep neigh_suppress`.

3. **`autowire` placed in the wrong ndppd config block.** The post had `autowire yes` inside `rule { ... }`, but in stock ndppd (Daniel Adolfsson v0.2.5 — the canonical fork) `autowire` is a `proxy`-level keyword, not a `rule`-level keyword. Moved `autowire yes` from inside the `rule` block to the `proxy` block.

## Review Notes

- The use case "ISP delegating a /48 to a customer while router has a /64 on the upstream link" is somewhat unusual — true /48 PD via DHCPv6-PD is typically *routed* and does not require NDP proxy. NDP proxy is more typically used when the ISP gives you a single shared /64 on the upstream link with no PD. The wording is plausible but slightly imprecise; not strictly wrong, so left as-is.
- The "Mobile broadband where the device bridges a /128 prefix" wording is loose — a /128 is a single host address rather than a "prefix" — but the underlying scenario is real (some mobile carriers assign only a /64 or /128). Left as-is.
- The `ndppd-status` line is hedged with "If available", which is appropriate — the canonical ndppd does not ship a `ndppd-status` binary.
- The tcpdump filter using `ip6[40]` works for typical traffic without IPv6 extension headers; a more robust alternative would be `icmp6[icmp6type]`. Not corrected because the current filter is valid for the described scenario.
- The "Delegated Prefix" intro mentions a /48 while the script comment and `LAN_PREFIX` variable use a /64; this is consistent if you read the example as proxying one /64 out of the larger /48 delegation, so not corrected.
