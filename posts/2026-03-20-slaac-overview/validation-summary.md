# Validation Summary: How to Understand IPv6 Stateless Address Autoconfiguration (SLAAC)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- IPv6 Neighbor Discovery Protocol (NDP)
- Router Solicitation and Router Advertisement messages
- Prefix Information options
- Duplicate Address Detection (DAD)
- DHCPv6
- Linux iproute2 commands

## Sources Consulted
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 6275: Mobility Support in IPv6 - https://datatracker.ietf.org/doc/html/rfc6275
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC - https://datatracker.ietf.org/doc/html/rfc7217
- RFC 8064: Recommendation on Stable IPv6 Interface Identifiers - https://datatracker.ietf.org/doc/html/rfc8064
- RFC 8981: Temporary Address Extensions for SLAAC in IPv6 - https://datatracker.ietf.org/doc/html/rfc8981
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://datatracker.ietf.org/doc/html/rfc9915
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://datatracker.ietf.org/doc/html/rfc3849
- ip-address(8) Linux manual page - https://man7.org/linux/man-pages/man8/ip-address.8.html
- ip-route(8) Linux manual page - https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local `ip -6 addr help`, `ip -6 route help`, `man ip-address`, and `man ip-route` output

## Issues Found
- The introduction said SLAAC is "the default address configuration mechanism" and used on "virtually all" IPv6-capable networks. Updated this to say SLAAC processing is enabled by default on IPv6 hosts and is widely used, matching RFC 4862's default processing requirement without overstating deployment.
- The SLAAC process summary described link-local formation as `fe80::/10 + interface ID`. Updated it to mention the `fe80::/10` link-local prefix with zero-fill before the interface ID, matching RFC 4862 and RFC 4291.
- The SLAAC comparison said it works out of the box with any router. Updated this to routers that advertise an autonomous prefix, because SLAAC address generation depends on an RA Prefix Information option with the Autonomous flag set and valid parameters.
- The stateful DHCPv6 comparison said DHCPv6 is "triggered" by `M=1` in an RA. Updated this to "indicated", because RFC 4861 defines the M flag as an indication that DHCPv6 address configuration is available.
- The Prefix Information option section said `A=1` "triggers" SLAAC address generation. Updated this to "allows" SLAAC address generation, because RFC 4862 also requires conditions such as nonzero Valid Lifetime, usable prefix, and matching prefix/IID lengths.
- The Preferred Lifetime description said it is "shorter". Updated this to "not greater than Valid Lifetime", because equal preferred and valid lifetimes are permitted.
- The SLAAC process summary said an address enters PREFERRED state after DAD passes. Updated this to require a nonzero Preferred Lifetime, because a zero Preferred Lifetime makes the address deprecated immediately.
- The lifecycle heading attributed all states to RFC 4862 Section 5.5.4. Updated it to reference Sections 5.4 and 5.5.4, because TENTATIVE is part of DAD behavior.
- The lifecycle timer said DAD is approximately one second. Updated this to say the tentative-to-preferred transition depends on DAD duration and is often about one second by default.
- The lifecycle timers described the Preferred and Valid Lifetime transitions as generic RA durations. Updated them to state that deprecation occurs when Preferred Lifetime expires and invalidation occurs when Valid Lifetime expires.
- The conclusion repeated that the A flag "triggers" SLAAC. Updated it to "allows SLAAC" for the same RFC 4862 reason.

## Review Notes
The Linux commands are valid for iproute2. The `dynamic` IPv6 address flag is documented by `ip-address(8)` as stateless address configuration, and `proto ra` / `proto kernel` route output is consistent with `ip-route(8)`. RFC 8064 recommends RFC 7217 stable, semantically opaque IIDs as the default for stable SLAAC addresses and recommends against embedding stable link-layer addresses by default; the post's EUI-64 example remains technically valid as an address-generation method.
