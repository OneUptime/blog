# Validation Summary: How to Configure BGP Soft Reconfiguration for Policy Changes

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- BGP
- FRRouting (FRR / `vtysh`)
- Cisco IOS
- Route Refresh (RFC 2918)

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 2918, Route Refresh Capability for BGP-4: https://www.rfc-editor.org/rfc/rfc2918.html
- Cisco IOS XE IP Routing Configuration Guide, BGP 4 Soft Configuration: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-soft-config.html
- Cisco IOS IP Routing: BGP Command Reference (`clear ip bgp`, `neighbor ... soft-reconfiguration inbound`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html

## Issues Found
- The FRR Route Refresh example used `clear bgp 10.0.0.2 soft in`, but current FRR documentation distinguishes Route Refresh from stored-route soft reconfiguration and documents `clear bgp PEER in` for the Route Refresh path. I changed the FRR example to `clear bgp 10.0.0.2 in`.
- The FRR example `clear bgp ipv4 unicast soft` did not identify a peer and did not match the documented FRR command forms. I replaced it with the address-family-specific per-peer form `clear bgp ipv4 unicast 10.0.0.2 in`.
- The inbound-policy reapply example could be read as a Route Refresh example even though it relies on stored pre-policy routes. I clarified the comment so the `soft in` usage is tied to stored-route re-evaluation.
- The verification commands were ambiguous for an IPv4 example and implied `received-routes` was always available. I changed them to explicit `ipv4 unicast` show commands and noted that `received-routes` is specifically useful when `soft-reconfiguration inbound` is enabled.
- The hard-reset disruption description overstated the outcome as a guaranteed traffic blackhole. I corrected it to the more precise behavior that routes are withdrawn and traffic can be disrupted during reconvergence.
- The takeaway section conflated soft reset, soft reconfiguration, and Route Refresh. I tightened the wording to recommend soft resets over hard resets and to describe Route Refresh as the more memory-efficient option.

## Review Notes
- FRR’s current documentation uses slightly different wording for inbound soft reset versus Route Refresh (`clear bgp PEER soft in` versus `clear bgp PEER in`), so being explicit about which mechanism is in use avoids cross-vendor confusion.
- Cisco IOS still commonly presents the inbound/outbound soft reset workflow as `clear ip bgp NEIGHBOR soft in|out`, while Route Refresh support is negotiated as a capability on modern sessions.
- No additional technical issues remained after these corrections.
