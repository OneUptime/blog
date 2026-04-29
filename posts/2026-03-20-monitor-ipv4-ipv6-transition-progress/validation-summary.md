# Validation Summary: How to Monitor IPv4 to IPv6 Transition Progress on Your Network

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- nmap (IPv4 and IPv6 host discovery, NSE scripts)
- Linux `ip` command (IPv6 address inspection)
- SNMP / `snmpwalk` (IP-MIB and IPV6-MIB counters)
- Python `socket.getaddrinfo` (DNS resolution / address family detection)
- Python `csv` module
- `curl` (IPv4/IPv6 connection forcing)
- `dig` (A and AAAA record lookups)
- Happy Eyeballs (RFC 8305 / RFC 6555)
- Mermaid (Gantt chart syntax)

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (global unicast 2000::/3, multicast scopes)
- RFC 6555 — Happy Eyeballs v1 (April 2012)
- RFC 8305 — Happy Eyeballs Version 2 (December 2017, obsoletes RFC 6555)
- RFC 1213 / IP-MIB — `ipInReceives` OID `1.3.6.1.2.1.4.3`
- RFC 2465 / IPV6-MIB — `ipv6IfStatsInReceives` OID `1.3.6.1.2.1.55.1.6.1.1`
- RFC 4293 — Management Information Base for the Internet Protocol (unifies IPv4/IPv6 counters; obsoletes IPV6-MIB)
- Nmap NSE script reference: `targets-ipv6-multicast-echo`, `targets-ipv6-multicast-mld`, `targets-ipv6-multicast-slaac`
- Python `socket` module documentation (`getaddrinfo`, `AF_INET`, `AF_INET6`)
- `iproute2` `ip-address(8)` man page

## Issues Found

1. **Step 1 — Impractical nmap command for IPv6 link-local discovery.** The original command was `nmap -6 -sn fe80::/64 --interface eth0`. A /64 contains 2^64 addresses, and nmap cannot enumerate that range with a ping scan in any practical sense. Replaced with the canonical NSE multicast discovery approach (`--script targets-ipv6-multicast-echo,targets-ipv6-multicast-mld -e eth0`) and added a brief inline comment explaining why brute-force enumeration of a /64 doesn't work.

2. **Step 5 — Outdated Happy Eyeballs RFC reference.** The post cited RFC 6555. RFC 8305 (Happy Eyeballs v2, December 2017) obsoletes RFC 6555 and is what modern clients implement. Updated the text to cite RFC 8305 while noting it obsoletes 6555.

## Review Notes

- The SNMP OID for `ipv6IfStatsInReceives` (`1.3.6.1.2.1.55.1.6.1.1`) is technically correct, but the IPV6-MIB it comes from was obsoleted by RFC 4293, which unified IPv4 and IPv6 counters under the IP-MIB (`ipSystemStatsTable` / `ipIfStatsTable`, e.g. `ipIfStatsHCInReceives` at `1.3.6.1.2.1.4.31.3.1.6` indexed by address family). Most network gear still exposes the legacy IPV6-MIB OIDs, so the example will work in practice; left unchanged but worth noting in a future revision.
- The post's description mentions `ping6` and `traceroute6`, but neither is actually used in the body. Minor mismatch only — not a technical error.
- The Python script's percentage formatting uses integer division (`100*ipv6_count//len(results)`), which truncates. Acceptable for a progress dashboard but could yield 0% for very small samples; left as the author wrote it.
- `ip -6 addr show scope global` correctly filters for global unicast addresses, and "starts with 2xxx or 3xxx" accurately reflects the 2000::/3 allocation.
- The Mermaid Gantt syntax (`dateFormat YYYY-MM`, `:done`, `:active` task states) is valid.
