# Validation Summary: How to Configure OSPF Not-So-Stubby Areas (NSSA)

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OSPF (Open Shortest Path First)
- OSPF NSSA (Not-So-Stubby Area) — RFC 3101
- Cisco IOS routing configuration
- LSA types (Type 1, 2, 3, 4, 5, 7)
- Route redistribution (connected, static)

## Sources Consulted
- RFC 3101 — The OSPF Not-So-Stubby Area (NSSA) Option (https://datatracker.ietf.org/doc/html/rfc3101)
- RFC 2328 — OSPF Version 2 (https://datatracker.ietf.org/doc/html/rfc2328)
- Cisco IOS IP Routing: OSPF Configuration Guide — `area nssa` command reference (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/15-mt/iro-15-mt-book/iro-cfg.html)
- Cisco IOS Command Reference — `area nssa`, `redistribute`, `show ip ospf database` commands

## Issues Found
No technical issues found.

All configuration commands (`area X nssa`, `area X nssa no-summary`, `area X nssa default-information-originate`, `area X nssa translate type7 always`, `redistribute connected subnets`, `redistribute static subnets`) are correct Cisco IOS syntax. The LSA types table is accurate for a regular NSSA. The behavioral claims (default route is NOT auto-injected into regular NSSA but IS auto-injected into totally NSSA; highest Router ID wins translator election by default) match RFC 3101 and Cisco's implementation.

## Review Notes
- The post correctly notes the asymmetry between stub areas (auto-inject default) and NSSA (no auto-inject for regular NSSA), which is a common point of confusion.
- The Mermaid diagram uses `\n` for line breaks inside node labels; this works in current Mermaid versions but may render inconsistently in some renderers — `<br>` is sometimes preferred, but `\n` is acceptable.
- The `show ip ospf | include NSSA` sample output is illustrative; actual Cisco IOS output formatting may vary slightly between IOS versions, but the substance is correct.
- For totally NSSA, the post correctly states that `no-summary` is applied only on the ABR while internal routers continue to use the plain `area X nssa` command.
