# Validation Summary: How to Configure BGP Origin Validation for IPv6 on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- RPKI
- RTR (RPKI-to-Router)
- IPv6
- Cisco IOS-XE
- Cisco IOS-XR

## Sources Consulted
- Cisco IOS XE BGP configuration guide, `BGP—Origin AS Validation`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-3s/irg-xe-3s-book/irg-origin-as.html
- Cisco IOS BGP command reference, `bgp rpki server` and related commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS BGP command reference, `show ip bgp rpki servers`, `show ip bgp rpki table`, and IPv6 BGP show output: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS XR routing configuration guide, `Implementing BGP`: https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/asr9k-r7-8/routing/configuration/guide/b-routing-cg-asr9000-78x/implementing-bgp.html
- Cisco support whitepaper, `Understand BGP RPKI With XR7 Cisco8000`: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/217020-bgp-rpki-with-xr7-cisco8000-whitepaper.html
- RFC 6811, `BGP Prefix Origin Validation`: https://datatracker.ietf.org/doc/rfc6811/
- RFC 8210, `The Resource Public Key Infrastructure (RPKI) to Router Protocol, Version 1`: https://datatracker.ietf.org/doc/rfc8210/
- RIPE NCC, `Ending Support for the RIPE NCC RPKI Validator`: https://www.ripe.net/about-us/news/ending-support-for-the-ripe-ncc-rpki-validator/
- NLnet Labs Routinator documentation, `RTR Service`: https://routinator.docs.nlnetlabs.nl/en/v0.12.2/rtr-service.html

## Issues Found
- The post claimed `Cisco IOS-XE (15.2+)` and `IOS-XR 5.3+` as the prerequisite versions. I replaced that with version-neutral wording because the feature introduction varies by train, and the original statement mixed Cisco IOS and IOS-XE numbering.
- Several IPv6 example addresses were not valid IPv6 literals because they used labels such as `validator` and `peer`. I replaced them with valid documentation-prefix addresses.
- The IOS-XE verification command `show bgp rpki server` was incorrect. I changed it to the documented `show ip bgp rpki servers`.
- The IOS-XE step for enabling validation used nonexistent `bgp origin-validation signal ibgp` commands. I corrected that section to the documented behavior: validation starts once `bgp rpki server` is configured, and iBGP signaling uses `neighbor ... announce rpki state` with `send-community extended`.
- The RPKI status note said `?` meant not found. I corrected this to the documented RPKI validation codes `V`, `I`, and `N`; `?` is the BGP origin code for incomplete.
- The IOS-XE commands to list `rpki invalid` and `rpki valid` IPv6 routes were not supported by the documentation I verified. I replaced them with the documented IPv6 BGP table and RPKI table verification commands.
- The IOS-XR example configured a cache server and route-policy but did not actually enable origin validation for the IPv6 address family. I added `bgp origin-as validation enable` under `address-family ipv6 unicast`.
- The prerequisite validator example listed `RIPE Validator`, which is no longer supported. I replaced it with currently supported validator examples.

## Review Notes
- The post is now technically correct for a general Cisco IOS-XE and IOS-XR RPKI origin-validation workflow.
- Port `3323` is still a common validator default in practice, but RFC 8210 registers TCP port `323` for RTR. The post uses `3323` consistently, which is acceptable for example validator deployments such as Routinator.
- On IOS-XE, RPKI validation begins once the router is configured to use an RPKI cache for the address family; the `announce rpki state` command is only for signaling state to iBGP neighbors.
