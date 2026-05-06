# Validation Summary: How to Implement BGP Graceful Restart for Non-Stop Forwarding

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP Graceful Restart
- RFC 4724
- Cisco IOS/IOS XE BGP
- Cisco NSF/SSO
- FRRouting

## Sources Consulted
- RFC 4724: Graceful Restart Mechanism for BGP - https://www.rfc-editor.org/rfc/rfc4724
- Cisco IOS XE BGP command reference for `bgp graceful-restart` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS XE BGP Graceful Restart per Neighbor documentation - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-grace-restart-neighbor.html
- Cisco IOS XE BGP NSF Awareness documentation - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-nsf-awareness.html
- FRRouting BGP documentation - https://docs.frrouting.org/en/latest/bgp.html

## Issues Found
- The post said Cisco IOS graceful restart is enabled per address family. I changed this to reflect Cisco documentation: `bgp graceful-restart` is configured under BGP router configuration mode, while capability exchange is negotiated per address family with each neighbor.
- The graceful restart sequence diagram had the order wrong by showing the restarting router send the GR OPEN before the helper marked routes stale. I corrected the sequence so the helper marks routes stale after the failure and the restarting router re-establishes the session afterward.
- The Cisco verification example used output that does not match Cisco's documented `show ip bgp neighbors` wording. I replaced it with the documented capability and timer lines.
- The NSF section implied a separate enable/verification flow and referenced an `include NSF` check that is not how Cisco documents BGP GR verification. I corrected the wording to show that `bgp graceful-restart` enables BGP NSF awareness on the peer, while actual nonstop forwarding depends on NSF/SSO platform support.
- The FRRouting section unconditionally set `bgp graceful-restart preserve-fw-state`. I clarified that this should be used only when forwarding state is actually preserved during restart, which is what the F-bit represents.
- The test procedure used `clear ip bgp * soft`, which is a soft reset and does not simulate a BGP process restart for graceful restart behavior. I replaced it with a vendor-neutral instruction to trigger a real BGP restart and to verify stale routes with `show ip bgp`.

## Review Notes
- Cisco documentation varies by platform and release on whether BGP graceful restart is enabled by default, so the post should avoid assuming defaults and should continue to rely on `show ip bgp neighbors` for verification.
- The post remains intentionally high level about the exact restart action in lab testing because the correct mechanism differs by platform.
