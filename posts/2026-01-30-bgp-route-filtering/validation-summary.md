# Validation Summary: How to Implement BGP Route Filtering

## Status
validated

## Post Type
Technical guide / Configuration tutorial

## Technologies Covered
- BGP
- Cisco IOS/IOS-XE BGP policy, prefix lists, AS-path filters, route maps, communities, RPKI, and maximum-prefix
- Juniper Junos routing policy, route filters, AS-path filters, communities, and prefix limits
- FRRouting BGP policy and RPKI
- RPKI / Route Origin Validation
- Routinator RPKI validator
- bgpq4 IRR filter generation

## Sources Consulted
- RFC 4271, A Border Gateway Protocol 4 (BGP-4): https://datatracker.ietf.org/doc/html/rfc4271
- RFC 6811, BGP Prefix Origin Validation: https://datatracker.ietf.org/doc/html/rfc6811
- RFC 5398, AS Number Reservation for Documentation Use: https://datatracker.ietf.org/doc/html/rfc5398
- RFC 6996, AS Reservation for Private Use: https://datatracker.ietf.org/doc/html/rfc6996
- IANA Special-Purpose AS Numbers registry: https://www.iana.org/assignments/iana-as-numbers-special-registry
- Cisco IOS BGP command reference for `match as-path`, `match rpki`, route-map behavior, and RPKI state matching: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco BGP Maximum-Prefix feature documentation: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/25160-bgp-maximum-prefix.html
- Cisco prefix-list command reference: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/9-x/unicast/configuration/guide/l3_cli_nxos/l3_rpm.html
- Juniper Junos basic BGP routing policies: https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/basic-routing-policies.html
- Juniper Junos prefix-list match semantics: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/policy-configuring-prefix-lists-for-use-in-routing-policy-match-conditions.html
- Juniper Junos route-filter match semantics: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/policy-configuring-route-lists-for-use-in-routing-policy-match-conditions.html
- Juniper Junos BGP communities routing policy documentation: https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/routing-policies-communities.html
- FRRouting BGP and RPKI documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- bgpq4 official README and option reference: https://github.com/bgp/bgpq4
- Routinator RTR service and configuration documentation: https://routinator.docs.nlnetlabs.nl/en/v0.13.2/rtr-service.html and https://routinator.docs.nlnetlabs.nl/en/v0.13.2/configuration.html
- CIDR Report for current IPv4 BGP table size on 2026-06-12: https://www.cidr-report.org/

## Issues Found
- The Junos bogon example used a `prefix-list` for RFC 1918 and default-route filtering. Junos prefix lists match exact prefixes unless combined with a prefix-list filter, so this would not reject more-specific RFC 1918 routes such as `10.1.2.0/24`. Replaced the bogon `prefix-list` match with `route-filter ... orlonger` entries and an exact default-route filter.
- The FRRouting RPKI cache example omitted the cache transport. FRR documents the TCP form as `rpki cache tcp <host> <port> preference <n>`. Added the `tcp` keyword.
- The Cisco maximum-prefix comment said `warning-only` would warn at 75% and shut down at 100%. Cisco documents `warning-only` as logging instead of terminating the peering session. Updated the comment to say it warns without shutting down.
- The full-table Cisco maximum-prefix example used `900000`, which is below the current IPv4 global table size reported by CIDR Report on 2026-06-12. Updated the example to `1200000` and clarified that operators should size this above the current table.
- The complete Cisco route-map example used deny entries in prefix lists and AS-path access lists, then referenced them from deny route-map clauses. Route-map matches operate on permitted matches from the referenced list, so the original configuration would deny good prefixes and fail to match the intended bad AS paths. Changed the bogon prefix list and AS-path list to permit the routes/paths that the deny route-map clauses should reject.
- The complete Cisco AS-path example used bracket expressions such as `_[64496-64511]_` to represent numeric ASN ranges. BGP regex character classes do not express multi-digit numeric ranges. Replaced these with explicit numeric regex fragments for the documentation ASN ranges from RFC 5398.
- The Routinator configuration snippet used an outdated `[output]` block with `format = "rpki-rtr"` and `listen = ...`. Current Routinator documentation uses TOML keys such as `rtr-listen`. Updated the snippet to `rtr-listen = ["192.0.2.100:8282"]`.

## Review Notes
The examples are illustrative and use documentation prefixes and ASNs. In a production network, bogon lists, maximum-prefix limits, IRR-generated filters, and RPKI validator settings should be generated and reviewed against the operator's actual peers, address holdings, hardware capacity, and current global table size.
