# Validation Summary: How to Configure BGP Dampening to Suppress Flapping Routes

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- BGP route dampening
- Cisco IOS
- Route maps
- IP prefix lists

## Sources Consulted
- Cisco IOS IP Routing: BGP Command Reference: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book.pdf
- IP Routing: BGP Configuration Guide, Cisco IOS XE Release 3S, "Configuring Internal BGP Features": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-3s/irg-xe-3s-book/irg-int-features.html
- RFC 7196, "Making Route Flap Damping Usable": https://www.rfc-editor.org/rfc/rfc7196.html
- Cisco Support, "Troubleshoot Flapping BGP Routes (Recursive Routing Failure)": https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/19167-bgp-rec-routing.html
- Cisco Support, "Examinar estudos de caso do Border Gateway Protocol": https://www.cisco.com/c/pt_br/support/docs/ip/border-gateway-protocol-bgp/26634-bgp-toc.pdf

## Issues Found
- The dampening behavior section implied universal defaults. I corrected it to Cisco IOS-specific behavior and added the documented attribute-change penalty of 500.
- The selective route-map example was technically wrong. A `permit 20` clause with no match would permit all remaining routes, so it would not leave "everything else" undampened. I removed that clause and kept the selective match-only route map.
- The same route-map example mixed `bgp dampening route-map ...` with `set dampening ...` in a way that does not match the documented selective-enable example. I removed the `set dampening` line from that snippet.
- The custom dampening example used the classic suppress threshold of 2000 while the post later described defaults as conservative. I changed the custom example to a less aggressive suppress threshold of 6000 and updated the guidance to match RFC 7196.
- The `show ip bgp` and `clear ip bgp dampening` examples used CIDR notation where Cisco IOS documents the network-plus-mask form. I corrected those commands to `192.168.99.0 255.255.255.0`.
- The sample output for route inspection and dampened routes was adjusted to match documented Cisco IOS output fields and status codes more closely.
- The monitoring note said `show ip bgp flap-statistics` identifies unstable neighbors. That command identifies unstable routes, not neighbors, so I corrected the wording.
- The RIPE-229 recommendation was outdated for current operational guidance. I replaced it with RFC 7196 guidance noting that the classic suppress threshold of 2000 is overly aggressive.

## Review Notes
- Cisco documentation still documents the classic defaults and older operational guidance, while RFC 7196 recommends less aggressive suppress thresholds for safer deployment. The post now reflects that distinction.
- The examples remain Cisco IOS-specific. Equivalent commands and policy syntax differ on IOS XR and NX-OS.
