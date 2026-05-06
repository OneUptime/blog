# Validation Summary: How to Configure BGP IPv6 Communities

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- FRRouting
- BGP standard communities
- BGP large communities
- Route policy and route maps

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 1997, BGP Communities Attribute: https://www.rfc-editor.org/rfc/rfc1997
- RFC 4360, BGP Extended Communities Attribute: https://www.rfc-editor.org/rfc/rfc4360
- RFC 8092, BGP Large Communities Attribute: https://www.rfc-editor.org/rfc/rfc8092
- IANA BGP Well-known Communities registry: https://www.iana.org/assignments/bgp-well-known-communities/bgp-well-known-communities.xhtml

## Issues Found
- The example neighbor address and verification prefix used invalid IPv6 text (`2001:db8:peer::...`). I replaced them with valid documentation-prefix examples so the configs and show commands are syntactically correct.
- The FRRouting example used `neighbor ... send-community` without an option and described it as mandatory. Current FRR documents `send-community <both|all|extended|standard|large>` and notes community sending is enabled by default, so I changed the example to `send-community standard` and corrected the comment.
- The alternative `NO_EXPORT_TAG` route map used `set community no-export` without `additive`, which would overwrite existing communities. I changed it to `set community no-export additive` so it adds the tag while preserving existing values.
- The large-community match example used `match large-community MY_LC` as though the command took a named large-community list. FRR documents `match large-community` as matching a large-community string or regex, so I changed it to `match large-community 131072:100:1`.
- Several well-known community descriptions were too loose or inaccurate. I corrected the actions for `no-export`, `no-advertise`, `local-AS`, and `internet` to align with RFC 1997, FRR documentation, and the IANA registry.
- The IXP section described operator-defined exchange communities as "well-known communities", which conflicts with the RFC meaning of well-known communities. I changed that wording to "operator-defined communities".
- The verification command `show bgp ipv6 unicast | grep Community` would not reliably show community attributes in FRR's normal table output. I changed it to `show bgp ipv6 unicast detail-routes | grep Community`, which matches FRR's documented detailed route display.

## Review Notes
- The examples are FRRouting-specific and assume the base BGP neighbor definition and surrounding router configuration already exist outside the snippet.
- Current FRR documentation states community sending is enabled by default; the explicit `send-community standard` line is still a valid and clearer example.
