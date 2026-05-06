# Validation Summary: How to Set Up BGP on pfSense or OPNsense

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- pfSense
- OPNsense
- FRRouting (FRR)
- BGP
- IPv4 routing
- Firewall policy for TCP/179

## Sources Consulted
- Netgate pfSense FRR package docs: https://docs.netgate.com/pfsense/en/latest/packages/frr/index.html
- Netgate pfSense FRR Global Settings docs: https://docs.netgate.com/pfsense/en/latest/packages/frr/global/configuration.html
- Netgate pfSense BGP required information: https://docs.netgate.com/pfsense/en/latest/packages/frr/bgp/required-info.html
- Netgate pfSense BGP neighbor configuration: https://docs.netgate.com/pfsense/en/latest/packages/frr/bgp/config-neighbor.html
- Netgate pfSense BGP example configuration: https://docs.netgate.com/pfsense/en/latest/packages/frr/bgp/example.html
- Netgate pfSense raw FRR configuration docs: https://docs.netgate.com/pfsense/en/latest/packages/frr/raw/index.html
- OPNsense Dynamic Routing (FRR) docs: https://docs.opnsense.org/manual/dynamic_routing.html
- OPNsense BGP tutorials: https://docs.opnsense.org/manual/how-tos/dynamic_routing_bgp.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting VTY shell documentation: https://docs.frrouting.org/en/latest/vtysh.html
- RFC 4271 (BGP-4): https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The OPNsense navigation path was outdated. I changed `Services → Dynamic Routing → BGP` to the current `Routing → General` and `Routing → BGP` paths and reflected the required global enable step.
- The original "Global Settings" example mixed fields from different screens and products. I separated pfSense global settings from OPNsense global routing settings and kept the BGP AS/router ID values in the BGP-specific section.
- The Router ID guidance was too narrow. I changed it from "interface IP facing the BGP peer" to a unique local IPv4 address, which matches current pfSense and FRR documentation.
- The neighbor example implied `Update Source` should always be set to `WAN`. I corrected it to an optional setting used when sourcing from a specific interface or loopback.
- The raw FRR snippet included `frr version 8.x`, which is not a valid literal configuration line, and it omitted current eBGP route-policy requirements. I removed the placeholder version line and added an `ALLOW-ALL` route map with inbound and outbound application to the neighbor.
- The operational commands used older / ambiguous BGP CLI forms. I updated them to explicit IPv4 unicast commands (`show bgp ipv4 unicast ...`) so the examples match current FRR guidance more closely.
- The firewall-rule example was too WAN-specific. I generalized it to the actual peering interface and added the OPNsense auto-created FRR firewall-rule caveat.

## Review Notes
- Current pfSense FRR behavior requires explicit eBGP policy/filtering before routes are exchanged. The revised post documents the route-map approach instead of the less secure workaround of disabling eBGP require-policy.
- The post is intentionally IPv4-only. An IPv6 version would need different address-family examples and interface/firewall details.
- The revised `network` guidance now reflects current FRR behavior: by default, the prefix must be present in the routing table unless network import-check is disabled.
