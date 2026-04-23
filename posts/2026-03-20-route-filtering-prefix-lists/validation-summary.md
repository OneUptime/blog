# Validation Summary: How to Configure Route Filtering with Prefix Lists

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- FRRouting (FRR)
- IPv4 prefix lists
- OSPFv2 route filtering and redistribution policy
- BGP route filtering
- Route maps
- vtysh CLI

## Sources Consulted
- FRR Filtering documentation: https://docs.frrouting.org/en/latest/filter.html
- FRR OSPFv2 documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR Route Maps documentation: https://docs.frrouting.org/en/latest/routemap.html
- RFC 2328, OSPF Version 2: https://datatracker.ietf.org/doc/html/rfc2328
- RFC 4271, Border Gateway Protocol 4: https://datatracker.ietf.org/doc/html/rfc4271

## Issues Found
- The OSPF examples used `distribute-list prefix ...` and described filtering routes received from OSPF neighbors. Current FRR OSPF documentation uses `area ... filter-list prefix ...` for Type-3 summary-LSA filtering on ABRs, and redistribution filtering is done with a route map. Updated the section to use a route map for static redistribution and `area 0.0.0.1 filter-list prefix NO-DEFAULT in` for OSPF area filtering.
- The BGP neighbor policy examples omitted the IPv4 address-family context used in FRR's documented examples. Updated the BGP prefix-list and route-map application snippets to place the neighbor policy under `address-family ipv4 unicast`.
- The verification example labeled as testing a prefix used `show ip prefix-list NAME PREFIX`. FRR documents `debug prefix-list NAME match PREFIX` for executing the prefix-list match logic and showing the matching entry. Updated the command accordingly.
- The conclusion implied that an explicit final prefix-list line is needed to avoid ambiguity. FRR documents a default deny when a defined prefix list has no match. Updated the wording to explain the default behavior and the value of making it explicit.

## Review Notes
- The examples are IPv4-focused. IPv6 prefix filtering would use `ipv6 prefix-list` and IPv6 address-family commands.
- The BGP snippets assume the neighbor is already configured and activated elsewhere.
