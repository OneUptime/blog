# Validation Summary: How to Understand SRv6 Transit Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SRv6
- IPv6 Segment Routing Header (SRH)
- RFC 8754 SRH processing
- RFC 8986 SRv6 Network Programming
- Linux iproute2 `seg6` route encapsulation
- SRv6 endpoint behaviors such as `End.X` and `End.DT6`

## Sources Consulted
- RFC 8754, IPv6 Segment Routing Header (SRH): https://www.rfc-editor.org/rfc/rfc8754.html
- RFC 8986, Segment Routing over IPv6 (SRv6) Network Programming: https://datatracker.ietf.org/doc/html/rfc8986
- Linux `ip-route(8)` manual for `seg6` route modes: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- Local `ip -6 route help` output from the installed iproute2 binary
- IETF draft for SRv6 insertion behavior, `draft-filsfils-spring-srv6-net-pgm-insertion-09`: https://datatracker.ietf.org/doc/html/draft-filsfils-spring-srv6-net-pgm-insertion/
- GitHub author profile URL: https://github.com/nawazdhandala

## Issues Found
- The post used `T.Insert`, `T.Encaps`, `T.Encaps.L2`, and `T.Encaps.Red` as if they were the RFC 8986 behavior names. RFC 8986 defines these encapsulation behaviors as SR policy headend behaviors named `H.Encaps`, `H.Encaps.Red`, and `H.Encaps.L2`; insertion is covered by a separate SRv6 insertion draft as `H.Insert`. I updated the behavior names and wording to distinguish plain transit forwarding from headend policy steering.
- The Linux insertion example used `encap seg6 mode insert`, which is not an iproute2 `seg6` mode. The documented and locally supported mode is `inline`, so I changed the command and explanatory comment.
- Several command examples and lifecycle examples used invalid IPv6 literals such as `2001:db8:dest::/48`, `5f00:mid1::`, `5f00:fw::`, and `5f00:lb::`. I replaced them with valid documentation-prefix IPv6 addresses.
- The plain transit packet example showed the current active SID as the IPv6 destination while `Segments Left` was `0`. For the displayed three-segment SRH, the first active segment should use `SL=2`, so I corrected the example.
- The reduced encapsulation explanation omitted the wrong segment and used the wrong `Segments Left` value. I updated it to match RFC 8754/RFC 8986 reduced SRH behavior: the first SID is placed in the outer destination address and omitted from the SRH, while `SL` still identifies the active segment index.
- The lifecycle example described `End.X` at the load balancer as selecting a server. RFC 8986 defines `End.X` as endpoint processing with Layer 3 cross-connect, so I changed that line to forwarding via the configured L3 adjacency.

## Review Notes
The corrected Linux examples are syntactically aligned with the installed `ip` command help and the current `ip-route(8)` manual. The `H.Insert` concept remains useful, but it is not part of RFC 8986 itself; it is described in an expired Internet-Draft and may be vendor or implementation dependent.
