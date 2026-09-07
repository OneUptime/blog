# Validation Summary: How to Design Redundant Internet Connectivity for a Single Colocation Rack

## Status
validated

## Post Type
Technical design guide. Although there are no executable commands or configuration examples, the post contains concrete routing, physical connectivity, power, capacity, and failover implementation guidance and therefore qualifies for technical review.

## Technologies Covered
- Colocation cross-connects, carrier diversity, and shared physical failure domains
- BGP, eBGP policy, ASNs, prefix filtering, maximum-prefix limits, and default routes
- RPKI route-origin validation and BGP communities
- Redundant edge routers, top-of-rack switching, and server connectivity
- A/B power distribution and automatic transfer switches
- BFD, routing convergence, TCP, NAT, stateful firewalls, and ingress filtering
- External monitoring and failure testing

## Sources Consulted
- RFC 4271, BGP-4: https://www.rfc-editor.org/rfc/rfc4271
- RFC 7454, BGP Operations and Security, particularly prefix filtering, maximum-prefix limits, and community policy: https://www.rfc-editor.org/rfc/rfc7454
- RFC 8212, mandatory default eBGP import/export behavior: https://datatracker.ietf.org/doc/html/rfc8212
- RFC 6996, private ASN operational restrictions: https://datatracker.ietf.org/doc/html/rfc6996
- RFC 6811, BGP Prefix Origin Validation: https://datatracker.ietf.org/doc/html/rfc6811
- RFC 5880, BFD detection and congestion considerations: https://datatracker.ietf.org/doc/html/rfc5880
- RFC 3704, ingress filtering and asymmetric multihoming: https://datatracker.ietf.org/doc/html/rfc3704
- RFC 3022, NAT session state and failover limitations: https://datatracker.ietf.org/doc/html/rfc3022
- Cisco, Configure BGP with Two Different Service Providers, including default-route-only operation: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/217964-configure-sample-for-bgp-with-two-differ.html
- Equinix, Cross Connect, including Diverse Campus Cross Connects and the internal-path diversity caveat: https://docs.equinix.com/cross-connect/
- APC/Schneider Electric, Automatic Transfer Switch AP7750A overview, dual input sources and single-corded loads: https://iportal2.schneider-electric.com/Contents/docs/UPS-DBEG-8LGGS6_R0_EN.PDF
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **RFC 8212 requirement and scope.** The post described default rejection as a recommendation without explicitly limiting the rule to eBGP. Changed the sentence to state the required import-selection and export-advertisement behavior specified in Section 3.
2. **Degraded capacity arithmetic.** Saying either link carries 700 Mbps did not establish the combined 1.4 Gbps load. Changed this to both links carrying 700 Mbps in the same direction, making the overload example valid for full-duplex circuits.
3. **TCP failure behavior and terminology.** Egress changes do not inherently reset TCP, and filtered packets commonly cause timeouts rather than resets. Changed the explanation to identify NAT mapping changes, lost session state, and filtering as failure causes; clarified that a path change can preserve TCP. Replaced the unclear phrase “source-address symmetry” with routing asymmetry and source-address validity.
4. **Power-test sequencing.** “A down, then B down” could leave both feeds disabled, which tests a different failure objective. Explicitly required restoring and verifying A before testing loss of B.

## Review Notes
- Confirmed Equinix distinguishes external campus path separation from internal IBX paths, which are not guaranteed diverse. No correction to that claim was needed.
- Default routes from two providers are a valid small-site design. They do not prove end-to-end Internet reachability when an upstream continues advertising a default during a remote failure; the proposed external monitoring and application-level failure measurements remain important.
- A private-AS design requires provider coordination and removal of private ASNs before global advertisement, as required by RFC 6996. The post appropriately makes this conditional on an approved design.
- Provider-managed redundancy and one-provider options have narrower failure coverage than independent-provider multihoming. Their suitability depends on the explicitly chosen failure objective and the provider's actual upstream design.
- The physical dependency inventory, surviving-capacity requirement, and facility-outage limitation are consistent with the stated single-rack scope. A transfer switch protects against an input-source failure; it does not duplicate the attached device's PSU.
- Reviewed the text path diagram as a conceptual dependency chain. There are no executable examples, CLI flags, APIs, configuration formats, or software versions to test for syntax or deprecation.
- Referenced documentation and the author profile resolved to the expected resources except that the RFC Editor URL for RFC 8212 returned HTTP 429 during review. Its contents were verified through the official IETF Datatracker mirror; the canonical link is valid and was retained.
- This was a documentation review, not a live network test. Actual path independence, hardware capacity, power behavior, convergence intervals, and session survival require the facility records and failure tests described in the post.
