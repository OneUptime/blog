# Validation Summary: How to Assign IPv6 Prefixes to Branch Offices

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and hierarchical prefix planning
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Python `ipaddress`
- Linux `iproute2`
- `ip6tables`
- wide-dhcpv6 `dhcp6c`

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc8415
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Debian `dhcp6c.conf(5)` man page for wide-dhcpv6: https://manpages.debian.org/trixie/wide-dhcpv6-client/dhcp6c.conf.5.en.html
- Debian `ip-route(8)` man page for iproute2: https://manpages.debian.org/experimental/iproute2/ip-route.8.en.html
- Local `ip -6 route help` output
- Local `ip6tables -h` output (`ip6tables v1.8.10 (nf_tables)`)

## Issues Found
- The original example prefixes used values such as `2001:db8:corp::/40`, which are not valid IPv6 syntax because `corp` is not hexadecimal. I replaced them with valid documentation prefixes under `2001:db8::/32`.
- The original address plan used a `/44` branch aggregate while stating that it provided 256 `/56` branch allocations. A `/44` contains 4096 `/56` prefixes. I changed the branch aggregate to `/48` so the allocation math, examples, and route summary are consistent.
- The Python allocator example validated a `/44` and instantiated an invalid branch block string. I updated it to use a valid `/48` branch block and explicit `/48` validation.
- The DHCPv6-PD snippet had a mismatched comment for the management VLAN: the comment said subnet ID 0 while the config used `sla-id 100`. I corrected the comment to match the configuration.
- The static route and firewall examples referenced the invalid prefixes and the incorrect `/44` summary. I updated them to the corrected `/48` plan.

## Review Notes
- The `ip6tables` syntax is valid, but on many current Linux systems it is implemented through the nftables backend. New deployments may prefer expressing equivalent policy directly in `nft`.
- The wide-dhcpv6 `dhcp6c.conf` syntax shown is valid for DHCPv6-PD, though the specific client in use varies by distribution and platform.
