# Validation Summary: How to Set Up NAT64 and DNS64 for IPv6-Only Networks

## Status
validated

## Post Type
Tutorial / Guide (infrastructure how-to)

## Technologies Covered
- NAT64 (RFC 6146) via Jool
- DNS64 (RFC 6147) via BIND and Unbound
- IPv6 / IPv4 address embedding (RFC 6052)
- ipv4only.arpa well-known name (RFC 7050 / RFC 8880)
- Linux networking: iptables/ip6tables, sysctl forwarding
- radvd (Router Advertisement / RDNSS / DNSSL)
- ISC DHCP (DHCPv6)
- systemd, Keepalived (VRRP) for HA
- Kubernetes (Unbound Deployment/Service)
- Prometheus / Grafana monitoring

## Sources Consulted
- Jool global configuration reference — https://nicmx.github.io/Jool/en/usr-flags-global.html (confirmed all global keys used: manually-enabled, maximum-simultaneous-opens, handle-rst-during-fin-rcv, source-icmpv6-errors-better, f-args, drop-externally-initiated-tcp, address-dependent-filtering, tcp-est-timeout, tcp-trans-timeout, mtu-plateaus, logging-bib, logging-session, pool6)
- Jool installation & CLI docs — https://nicmx.github.io/Jool/ (instance add, pool4 add, file handle, session/bib/stats display, iptables JOOL target)
- RFC 6052 (IPv6 addressing of IPv4/IPv6 translators) — well-known prefix 64:ff9b::/96, 32-bit IPv4 embedding
- RFC 7050 / RFC 8880 — ipv4only.arpa returns A records 192.0.0.170 and 192.0.0.171
- BIND ARM — dns64 statement (clients, mapped, exclude, suffix, recursive-only, break-dnssec)
- Unbound documentation — dns64 module (module-config, dns64-prefix, dns64-synthall)

## Issues Found
No technical issues found.

Spot-checked the two address calculations in the post, both correct:
- 93.184.216.34 → 64:ff9b::5db8:d822 (5d.b8.d8.22)
- 192.0.0.170 → 64:ff9b::c000:aa (c0.00.00.aa); 192.0.0.171 → 64:ff9b::c000:ab

Jool global option names, CLI syntax (`jool instance add`, `jool -i <name> pool4 add`, `jool file handle`, `session/bib/stats display`), and the iptables `-j JOOL --instance` target are all current for Jool 4.x. The dnsmasq note (no DNS64 support) is accurate.

## Review Notes
- The production Jool JSON config repeats the `"comment"` key multiple times within the same object. This is technically valid JSON (Jool ignores `comment` fields) and mirrors the style used in Jool's own examples, but strict JSON linters will flag the duplicate keys. Not an error; left as-is.
- The well-known prefix `64:ff9b::/96` is only valid for translating global IPv4 addresses; it must not be used to reach private (RFC 1918) IPv4 space. The post correctly recommends the well-known prefix for general internet access and mentions custom prefixes from your own allocation; readers needing to reach private IPv4 should use a Network-Specific Prefix.
- Jool prerequisite "kernel 4.4 or later" is a reasonable lower bound for Jool 4.x; very new kernels may require a current Jool release, which the post addresses by pinning a stable tag and noting "use latest stable version."
- DNS64 + DNSSEC validation is inherently in tension (synthesized AAAA records cannot be validated); the post correctly calls this out and sets `break-dnssec yes` in BIND. This is expected behavior, not a defect.
