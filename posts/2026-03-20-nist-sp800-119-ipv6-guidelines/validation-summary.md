# Validation Summary: How to Follow NIST SP 800-119 IPv6 Secure Deployment Guidelines

## Status
validated

## Post Type
Guide / Reference (compliance and security guidelines for IPv6 deployment)

## Technologies Covered
- IPv6 transition mechanisms (Dual-stack, 6in4, 6to4, Teredo, ISATAP, NAT64/DNS64)
- iptables / ip6tables (Linux netfilter)
- Windows netsh interface commands
- Linux kernel module blacklisting (modprobe)
- FRRouting BGP / RPKI route origin validation
- DNSSEC / DNS64 / dig
- NetFlow / IPFIX / syslog
- IPv6 ULA addressing (RFC 4193) and documentation prefix (2001:db8::/32)

## Sources Consulted
- NIST SP 800-119 "Guidelines for the Secure Deployment of IPv6" (Frankel, Graveman, Pearce, Rooks, Dec 2010)
- RFC 4193 "Unique Local IPv6 Unicast Addresses"
- RFC 2473 "Generic Packet Tunneling in IPv6"
- RFC 4380 "Teredo: Tunneling IPv6 over UDP through NATs"
- RFC 7011 "Specification of the IP Flow Information Export (IPFIX) Protocol" (IANA port 4739)
- IANA Protocol Numbers registry (protocol 41 = IPv6 encapsulation)
- Linux kernel documentation for `sit`, `ip6_tunnel`, `ip6_gre` modules
- FRRouting documentation for RPKI/BGP route-map syntax
- Microsoft netsh interface command reference
- Linux iptables LOG target documentation (syslog level mapping)

## Issues Found
1. **Invalid ULA address `fd00:mgmt::/48`** — "mgmt" contains non-hex characters (g, m, t) and is not a valid IPv6 address per RFC 4193. Replaced with `fd12:3456:789a::/48` and added a clarifying note that the Global ID should be generated per RFC 4193.
2. **`blacklist ipv6` overly broad** — Blacklisting the `ipv6` module disables IPv6 entirely, defeating the purpose of an IPv6 deployment guide. Additionally, on most modern distributions IPv6 is built into the kernel, not loaded as a module. Replaced with the correct tunnel-specific modules `ip6_tunnel` and `ip6_gre` alongside the existing `sit` blacklist (the `sit` driver is what handles 6to4/6in4/ISATAP IPv4-encapsulated tunneling).
3. **Non-standard NetFlow/IPFIX ports (9995/9996)** — These are not the standard ports. Per IANA, IPFIX uses UDP/TCP 4739 (RFC 7011), and NetFlow v9 commonly uses UDP 2055 as the de facto port. Updated the example tcpdump filter to use `2055 or 4739`.

## Review Notes
- The `bgp bestpath prefix-validate allow-invalid` example in the FRRouting RPKI snippet is technically valid syntax, but a complete configuration also needs a top-level `rpki` block defining a cache server (e.g., `rpki cache <ip> <port> preference 1`). The post's snippet shows only the BGP-side configuration; readers reproducing this should pair it with an RPKI cache definition.
- The Windows `netsh interface 6to4 / isatap / teredo set state disabled` commands are correct and accept this short form, though some references show `set state state=disabled`. Both are accepted by netsh.
- NIST SP 800-119 was published in December 2010 and predates several modern IPv6 security features (RFC 7217 stable privacy addresses, modern RA Guard practices, IPv6-only deployments). The guide is still authoritative for the high-level framework but readers should also consult more recent IETF guidance (RFC 9099 "Operational Security Considerations for IPv6 Networks").
- The mermaid diagram's "Phase 5: Decommission IPv4" is not a phase that NIST SP 800-119 itself prescribes (the document is about deploying IPv6 alongside IPv4) but is reasonable as an illustrative end-state.
