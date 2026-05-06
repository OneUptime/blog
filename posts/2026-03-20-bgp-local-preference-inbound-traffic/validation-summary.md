# Validation Summary: How to Configure BGP Local Preference for Inbound Traffic Control

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- BGP LOCAL_PREF (Local Preference)
- Cisco IOS
- Cisco route maps
- BGP route refresh / inbound soft reconfiguration

## Sources Consulted
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)" — https://datatracker.ietf.org/doc/rfc4271/
- RFC 2918, "Route Refresh Capability for BGP-4" — https://datatracker.ietf.org/doc/html/rfc2918
- Cisco, "Select BGP Best-path Algorithm" — https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13753-25.html
- Cisco IOS IP Routing: BGP Command Reference, `bgp default local-preference` — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco, "BGP Configuration Guide - Understanding BGP [Cisco IOS XE 17]" — https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/bgp/bgp-configuration-guide/routing-bgp.html
- Cisco, "IP Routing Configuration Guide, Cisco IOS XE 17.x - BGP 4 Soft Configuration" — https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-soft-config.html
- Cisco, "Understand Load Sharing with BGP in Single/Multihomed Environments" — https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13762-40.html
- Cisco, "BGP Conditional Advertisement Feature" — https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/215634-bgp-conditional-advertisement-feature.html

## Issues Found
- The title was technically incorrect. LOCAL_PREF is used within an AS to choose a preferred exit path for outbound traffic, not to control inbound traffic from external ASes. I changed the title from `Inbound Traffic Control` to `Outbound Traffic Control`.
- The `Default value: 100` statement was too broad as written. RFC 4271 defines LOCAL_PREF as a 32-bit attribute, but the default value of 100 is Cisco IOS behavior rather than a universal protocol default. I changed this to `Default value in Cisco IOS: 100`.
- The soft-reset step omitted an important prerequisite. `clear ip bgp <neighbor> soft in` depends on route refresh support or stored inbound soft-reconfiguration state. I added that caveat to the Step 5 text.
- The `show ip bgp 0.0.0.0 0.0.0.0` sample output did not match Cisco IOS-style attribute formatting. I updated it to use Cisco-style fields such as `Origin IGP, metric 0, localpref ..., valid, external, best`.

## Review Notes
- The BGP path-selection list is explicitly labeled simplified. In Cisco, MED comparison is normally limited to paths from the same neighboring AS unless `bgp always-compare-med` is configured.
- Exact `show ip bgp` formatting varies somewhat across Cisco IOS, IOS XE, and NX-OS releases, but the corrected examples now align with Cisco IOS-style output and behavior.
