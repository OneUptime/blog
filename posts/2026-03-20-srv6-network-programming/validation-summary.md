# Validation Summary: How to Understand SRv6 Network Programming

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SRv6 Network Programming
- IPv6 Segment Routing Header (SRH)
- SRv6 Segment Identifiers (SIDs)
- Linux iproute2 `seg6` and `seg6local`
- Service chaining and VPN endpoint behaviors

## Sources Consulted
- RFC 8986: Segment Routing over IPv6 (SRv6) Network Programming: https://datatracker.ietf.org/doc/html/rfc8986
- RFC 8754: IPv6 Segment Routing Header (SRH): https://datatracker.ietf.org/doc/html/rfc8754
- IANA Segment Routing Parameters registry: https://www.iana.org/assignments/segment-routing/segment-routing.xhtml
- iproute2 `ip-route(8)` man page from the upstream iproute2 v6.19.0 source tree: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/refs/tags/v6.19.0/man/man8/ip-route.8.in
- Linux `ip-route(8)` manual page mirror with `seg6local` behavior details: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux SRv6 implementation advanced configuration notes: https://segment-routing.org/index.php/Implementation/AdvancedConf
- Local `iproute2` command help (`iproute2-6.1.0`, `ip -6 route help`)

## Issues Found
- The introduction said each SID in the SRH represents a function. RFC 8986/RFC 8754 distinguish the active SID in the IPv6 destination address from SIDs carried in the SRH, so the wording was corrected.
- The transit behavior was described as a `T` instruction. RFC 8986 defines endpoint and headend behaviors, while ordinary transit forwarding is IPv6 forwarding toward the active SID without local SID processing. The section was corrected to avoid implying `T` is an RFC 8986 endpoint behavior.
- The behavior list presented `End.B6` as an RFC 8986 behavior. RFC 8986 defines `End.B6.Encaps` and `End.B6.Encaps.Red`; the IANA registry has `End.B6.Insert`, while Linux iproute2 exposes the insertion action as `End.B6`. The behavior name and explanation were corrected.
- The service-chain example implied `End.X` itself performs firewall inspection or server selection. `End.X` is an L3 cross-connect behavior, so the wording now says it steers traffic through the service nodes.
- The service-chain SRH example listed SIDs in forward order and used `SL=2`. RFC 8754 encodes the Segment List from last segment to first, and full encapsulation for four segments uses `SL=3`. The example was corrected.
- The `End.DT6 vrftable 100` example used `dev lo`. iproute2 documentation requires a VRF associated with the table ID and VRF strict mode enabled when using `vrftable`; the example now uses `dev vrf100` to make that VRF assumption explicit.
- The ingress route comment referred to IPv4 prefix `10.0.0.0/24`, but the command used `ip -6 route add 5f00:4::/32`. The command and verification were changed to IPv4 `ip route` so they match the stated traffic selector.
- The conclusion said SRv6 VPN/service chaining works without additional signaling protocols. That was narrowed to say control-plane signaling can be handled by routing protocols, an SDN controller, or static configuration.

## Review Notes
The command examples are illustrative and still assume normal SRv6 prerequisites: kernel SRv6 support, enabled forwarding/seg6 sysctls where required, reachable next hops, existing interfaces, and a configured VRF device for the `vrftable` example.
