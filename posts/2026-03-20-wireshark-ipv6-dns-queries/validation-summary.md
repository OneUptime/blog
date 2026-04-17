# Validation Summary: How to Analyze IPv6 DNS Queries in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide (Wireshark display filters and tshark commands for IPv6 DNS analysis)

## Technologies Covered
- Wireshark display filters
- tshark CLI
- DNS protocol (AAAA records, RCODE, EDNS0 Client Subnet)
- IPv6
- Shell pipelines (sort, uniq, diff, head)

## Sources Consulted
- Wireshark DNS display filter reference: https://www.wireshark.org/docs/dfref/d/dns.html
- RFC 3596 (DNS Extensions for IPv6) — AAAA record type 28
- RFC 1035 (DNS) — RCODE 3 = NXDOMAIN
- RFC 7871 (EDNS Client Subnet) — address family values (1 = IPv4, 2 = IPv6)
- Google Public DNS documentation — IPv6 resolver 2001:4860:4860::8888

## Issues Found
- **Incorrect Wireshark field name for EDNS0 Client Subnet address family.** The post used `dns.opt.dns.ecs.address_family`, which does not exist in Wireshark's DNS dissector. The correct field per the official Wireshark display filter reference is `dns.opt.client.family`. Fixed by replacing the field name; the value comparison (`== 2` for IPv6) remains correct per RFC 7871.

## Review Notes
- All other display filters verified against the Wireshark DNS filter reference: `dns.qry.type`, `dns.resp.type`, `dns.qry.name`, `dns.aaaa`, `dns.flags.rcode`, `dns.flags.response`, `dns.count.answers`, `dns.time`, `ipv6`, `ipv6.dst`.
- AAAA record type (28), NXDOMAIN rcode (3), and the Google Public DNS IPv6 resolver address are all accurate.
- tshark invocations (`-r`, `-Y`, `-T fields`, `-e`) are syntactically correct and match current tshark CLI conventions.
- The shell pipelines (`sort | uniq -c | sort -rn | head`, `diff`) are standard and portable.
