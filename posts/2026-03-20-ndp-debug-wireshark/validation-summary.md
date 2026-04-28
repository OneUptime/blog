# Validation Summary: How to Debug NDP with Wireshark Filters

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark display filters (ICMPv6 dissector)
- tshark CLI
- NDP (Neighbor Discovery Protocol) — RFC 4861
- SLAAC and DAD — RFC 4862
- RDNSS RA option — RFC 8106
- IPv6 ICMPv6 message types 133–137

## Sources Consulted
- RFC 4861 (Neighbor Discovery for IPv6), specifically §4.1–4.5 (message types), §4.6 (options), §7.2.4 (NA destination rules)
- RFC 4862 (IPv6 Stateless Address Autoconfiguration), §5.4.3 / §5.4.4 (DAD procedure and defense)
- RFC 8106 (IPv6 Router Advertisement Options for DNS Configuration), §5.1 (RDNSS option type 25)
- Wireshark ICMPv6 display filter reference: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- IANA "IPv6 Neighbor Discovery Option Formats" registry

## Issues Found
1. **tshark "Find DAD conflicts" filter was inverted.** The original filter was:

   ```
   icmpv6.type == 136 and icmpv6.nd.na.flag.s == 0 and not (ipv6.dst == 'ff02::1')
   ```

   Per RFC 4861 §7.2.4, when a node responds to a Neighbor Solicitation whose source is the unspecified address (i.e., a DAD probe), it MUST multicast the Neighbor Advertisement to the all-nodes address `ff02::1` with the Solicited flag set to zero. The filter as written excluded exactly those packets — meaning it would never surface a real DAD-defense NA. Changed `not (ipv6.dst == 'ff02::1')` to `ipv6.dst == ff02::1` and updated the explanatory comment to reflect that DAD-defense NAs go to all-nodes.

## Review Notes
- All Wireshark display filter field names used in the post (`icmpv6.nd.ra.flag.m`, `icmpv6.nd.ra.flag.o`, `icmpv6.nd.ra.router_lifetime`, `icmpv6.opt.type`, `icmpv6.nd.na.flag.s`, `icmpv6.nd.ns.target_address`, `icmpv6.nd.na.target_address`) are valid against the current Wireshark ICMPv6 dissector.
- NDP option type numbers (3=Prefix Information, 5=MTU, 25=RDNSS) are correct.
- Message type numbers 133–137 are correct.
- The "NUD probes" filter `not ipv6.dst matches "^ff"` works but `ipv6.dst != ff00::/8` would be more idiomatic for excluding all IPv6 multicast; left as-is since the regex form is functional.
- Quoted IPv6 literals (e.g., `ipv6.src == "::"`) are accepted by the Wireshark filter parser, though unquoted form is more common in documentation; left unchanged since both work.
