# Validation Summary: How to Calculate IPv6 Subnets from a /56 Allocation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Router Advertisements with `radvd`
- Python `ipaddress`

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 7421, "Analysis of the 64-bit Boundary in IPv6 Addressing" - https://www.rfc-editor.org/rfc/rfc7421.html
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6177, "IPv6 Address Assignment to End Sites" - https://datatracker.ietf.org/doc/html/rfc6177
- RFC 6164, "Using 127-Bit IPv6 Prefixes on Inter-Router Links" - https://www.rfc-editor.org/rfc/rfc6164
- RFC 7084, "Basic Requirements for IPv6 Customer Edge Routers" - https://www.rfc-editor.org/rfc/rfc7084
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://datatracker.ietf.org/doc/html/rfc8415
- Python Standard Library `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- `radvd.conf(5)` man page - https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html

## Issues Found
- The practical allocation examples used placeholder forms like `::0001::`, which are not valid IPv6 subnet notation. I replaced them with concrete `/64` prefixes such as `2001:db8:1100:1::/64`.
- The first allocation example labeled a delegated `/64` as `WAN/uplink`, which is misleading in a DHCPv6-PD context because the delegated prefix is typically subnetted for downstream/internal links. I changed this to `Transit/uplink (if routed internally; sometimes /127 or /64)` and updated the conclusion to use the same terminology.
- The `radvd` example enabled `AdvRouterAddr on;`, but `radvd` documents that option as a Mobile IPv6 case where the interface address is advertised instead of the network prefix. I removed it so the example matches standard LAN prefix advertisement behavior.
- The `/60 delegation` bullet under "When 256 Subnets Is Not Enough" implied it helps when you need more total subnets. A `/60` carved from the same `/56` only adds hierarchy, not more total `/64`s. I rewrote that line to reflect the actual tradeoff.

## Review Notes
- The IPv6 math, `/56` to `/64` expansion, and Python `ipaddress` example were technically correct as written and the sample output matched actual execution.
- For real DHCPv6-PD deployments, delegated prefixes can change over time, so a static `radvd.conf` with a hardcoded global prefix may need automation even though the example syntax is valid.
