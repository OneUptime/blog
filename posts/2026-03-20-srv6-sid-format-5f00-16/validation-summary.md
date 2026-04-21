# Validation Summary: How to Understand the SRv6 SID Format (5f00::/16) - A Practical Guide

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SRv6
- IPv6 Segment Identifiers
- RFC 9602 `5f00::/16` SRv6 SID address block
- RFC 8986 SRv6 Network Programming
- Linux iproute2 `seg6local`
- Python `ipaddress`

## Sources Consulted
- RFC 9602: Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture - https://datatracker.ietf.org/doc/rfc9602/
- IANA IPv6 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 8986: Segment Routing over IPv6 (SRv6) Network Programming - https://datatracker.ietf.org/doc/html/rfc8986
- IANA Segment Routing Parameters, SRv6 Endpoint Behaviors registry - https://www.iana.org/assignments/segment-routing/segment-routing.xhtml
- Linux `ip-route(8)` manual page for `seg6local` actions - https://man7.org/linux/man-pages/man8/ip-route.8.html
- Python `ipaddress` module documentation - https://docs.python.org/3/library/ipaddress.html
- Local `iproute2` help output from `ip -6 route help` (`iproute2-6.1.0`)
- GitHub author profile URL - https://github.com/nawazdhandala

## Issues Found
- The post described `5f00::/16` as globally routable. RFC 9602 and the IANA special-purpose registry mark it as source-valid, destination-valid, and forwardable, but not globally reachable. Updated the introduction and address block status to use the registry semantics.
- The 48/16/64 SID example placed `e000` in the fifth hextet (`5f00:1:1:0:e000::`), which makes it part of the 64-bit argument field rather than the 16-bit function field. Changed the example SID and Python parser input to `5f00:1:1:e000::`.
- The `End` Linux SID example used `5f00:1:1::1/128`, which places `1` in the argument field for the documented 48/16/64 split. Changed it to `5f00:1:1:1::/128`.
- The function-value section implied that function bits are standardized behavior IDs. RFC 8986 defines the function as an opaque local identifier and the IANA endpoint behavior codepoints as separate control-plane identifiers. Updated the wording to call the listed values local operator-chosen allocations.
- The `End.DT6 vrftable 100 dev lo` command was not a correct generic example because `vrftable` requires a VRF device associated with the table and VRF strict mode. Changed the example to `End.DT6 table 100 dev lo`.
- The "After RFC 9602" section said all operators use `5f00::/16`. RFC 9602 makes the block available and explicitly discusses deployments that may not use it. Changed the wording to say operators can use the subspace.
- Changed non-JavaScript diagram/list code fences from `javascript` to `text`.

## Review Notes
The Python example is syntactically valid and produces the documented output with the corrected SID. The Linux `seg6local` examples match current `iproute2` syntax, but require kernel SRv6 support and appropriate privileges to apply on a real host.
