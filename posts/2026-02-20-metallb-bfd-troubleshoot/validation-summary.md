# Validation Summary: How to Troubleshoot BFD Session Failures in MetalLB

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- BFD
- FRRouting
- Cisco IOS-style router configuration

## Sources Consulted
- MetalLB API reference for `BFDProfile` fields: https://metallb.io/apis/index.html
- MetalLB configuration documentation for enabling BFD on BGP peers: https://metallb.io/configuration/
- FRRouting BFD documentation for `show bfd` commands, timers, passive mode, multihop, and minimum TTL: https://docs.frrouting.org/en/latest/bfd.html
- RFC 5881 for single-hop BFD and echo UDP port behavior: https://datatracker.ietf.org/doc/html/rfc5881
- RFC 5883 for multihop BFD UDP port behavior: https://www.rfc-editor.org/rfc/rfc5883.html
- IANA service name and transport protocol port registry for BFD ports: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=bfd

## Issues Found
- The flowchart and summary implied BFD only uses UDP ports 3784 and 3785. Updated the post to distinguish single-hop control traffic on 3784, echo mode on 3785, and multihop control traffic on 4784.
- The troubleshooting flow and summary said timers should "match." BFD timers are negotiated, so they need to be compatible rather than identical. Updated the wording accordingly.
- The detection-time example could be read as a universal formula from one local field. Clarified that the 500ms x 5 example applies with symmetric timers.
- The restart section suggested passive mode can reduce re-establishment time after a MetalLB restart. FRRouting documents passive mode as waiting for peer control packets and not initiating the session, so this is only valid if the router is the active side and is not a restart recovery mechanism by itself. Updated the guidance and warned that both sides being passive prevents the session from coming up.
- The diagnostic checklist omitted multihop UDP port 4784 from the port check. Added it.

## Review Notes
The MetalLB `BFDProfile` examples use current documented fields for `metallb.io/v1beta1`, and `BGPPeer.spec.bfdProfile` is documented for enabling BFD on a BGP peer. The FRR `vtysh` diagnostic commands shown in the post are consistent with FRRouting BFD documentation.
