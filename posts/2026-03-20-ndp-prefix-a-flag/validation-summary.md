# Validation Summary: How to Understand the A Flag in Prefix Information Options

## Status
validated

## Post Type
Technical guide / tutorial — explains an IPv6 NDP protocol flag with hands-on configuration and packet-capture examples.

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861
- Stateless Address Autoconfiguration (SLAAC) — RFC 4862
- Prefix Information option flags (L, A)
- DHCPv6 (stateful) interaction via M flag
- radvd (Router Advertisement Daemon) configuration
- tcpdump for ICMPv6 packet capture
- Linux IPv6 sysctls (`accept_ra_pinfo`)

## Sources Consulted
- [RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)](https://datatracker.ietf.org/doc/html/rfc4861), particularly Section 4.6.2 (Prefix Information option)
- [RFC 4862 — IPv6 Stateless Address Autoconfiguration](https://datatracker.ietf.org/doc/html/rfc4862)
- [radvd.conf(5) man page](https://github.com/reubenhwk/radvd/blob/master/radvd.conf.5.man) — option names, syntax, and semantics
- [Linux kernel `Documentation/networking/ip-sysctl.txt`](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt) — `accept_ra_pinfo` and `autoconf` semantics
- tcpdump output reference for ICMPv6 prefix-info option formatting

## Issues Found

1. **Stray "O" flag reference in prefix-info tcpdump example.** The post had a comment `# With A=0, O=0, L=1:` describing prefix-information-option flags. The O flag does not exist in the Prefix Information option (RFC 4861 §4.6.2 defines only L and A flags plus reserved bits); the O flag belongs to the RA message header (alongside M). Removed the spurious `O=0` so the comment now reads `# With A=0, L=1:`, matching the actual prefix-info flags shown in the tcpdump output (`Flags [onlink]`).

2. **Imprecise wording about L=0 semantics.** The post described `A=1, L=0` as "Prefix is NOT on-link". Per RFC 4861 §4.6.2, when L is not set "the advertisement makes no statement about on-link or off-link properties of the prefix" — it does *not* mark the prefix as off-link. Changed to "No on-link statement (RA makes no claim about on/off-link)" to match the RFC.

## Review Notes

- The Prefix Information Option ASCII diagram (Type=3, Length=4, field widths/order) matches RFC 4861 §4.6.2 exactly.
- A/L flag semantics, M-flag/DHCPv6 interaction, and the dual-address (SLAAC + DHCPv6) caveat are all accurate.
- radvd option names (`AdvSendAdvert`, `AdvManagedFlag`, `AdvOnLink`, `AdvAutonomous`, `AdvValidLifetime`, `AdvPreferredLifetime`) are correct, and the trailing `};` after both interface and prefix blocks is the documented syntax.
- The `2592000` / `604800` lifetime values shown are the RFC 4861 *suggested* defaults — note that radvd's own compiled-in defaults differ (86400 / 14400). The post sets them explicitly, so this isn't an error, just worth knowing if the reader compares with radvd defaults.
- The tcpdump filter `icmp6 and ip6[40] == 134` is correct for RA messages without IPv6 extension headers (the common case). A modern alternative is `icmp6 and icmp6[icmp6type] == icmp6-routeradvert`.
- The `accept_ra_pinfo=0` advice works to disable SLAAC, but is broader than the comment "ignore A flag" suggests — it disables *all* prefix-info processing (including on-link learning). For a more surgical "disable SLAAC only" knob, `net.ipv6.conf.<iface>.autoconf=0` is the more precise sysctl. The post's stated outcome (no SLAAC addresses) is still correct.
