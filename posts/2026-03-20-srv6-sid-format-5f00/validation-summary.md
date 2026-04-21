# Validation Summary: How to Understand the SRv6 SID Format (5f00::/16)

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- SRv6 Segment Identifiers (SIDs)
- RFC 9602 `5f00::/16` SRv6 SID address block
- RFC 8986 SRv6 SID format and endpoint behaviors
- Linux SRv6 `seg6local` data plane configuration
- FRRouting SRv6 locator and IS-IS configuration
- Python `ipaddress` module

## Sources Consulted
- RFC 9602: Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc9602.html
- RFC 8986: Segment Routing over IPv6 (SRv6) Network Programming: https://www.rfc-editor.org/rfc/rfc8986.html
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/
- IANA Segment Routing registry, SRv6 Endpoint Behaviors: https://www.iana.org/assignments/segment-routing/
- Linux kernel Seg6 sysctl documentation: https://docs.kernel.org/networking/seg6-sysctl.html
- iproute2 `ip-route(8)` manual page for `seg6local`: https://man7.org/linux/man-pages/man8/ip-route.8.html
- FRRouting Zebra SRv6 locator documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting IS-IS SRv6 documentation: https://docs.frrouting.org/en/latest/isisd.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The post described `5f00::/16` as globally routable. RFC 9602 and the IANA special-purpose registry mark it as forwardable but not globally reachable, so the wording was changed to dedicated SRv6 special-purpose space for use within SR domains or collaborating SR domains.
- The Linux example used `ip -6 addr add` on `lo` to create End and End.X SIDs. That only assigns IPv6 addresses; it does not bind SRv6 endpoint behaviors. The example now uses `ip -6 route add ... encap seg6local action ...` and includes IPv6 forwarding/SRv6 sysctls.
- The "well-known function codes" section conflated SID Function values with IANA SRv6 Endpoint Behavior codepoints and listed several incorrect values. It now lists endpoint behavior codepoints, corrects the values, and explains that SID Function bits are locally assigned and opaque.
- The Python examples used `node_id` values `1`, `2`, and `3` while documenting `/48` locators such as `5f00:1::/48`. With the stated 16-bit block and 32-bit node layout, those inputs produce `5f00:0:1:...`, not `5f00:1:0:...`. The examples now pass `0x00010000`, `0x00020000`, and `0x00030000`.
- The FRR snippet placed the locator `prefix` under `router isis`. FRR defines locator prefixes under Zebra's global `segment-routing srv6 locators` hierarchy, and IS-IS references the locator by name. The snippet was corrected and now specifies `block-len 16 node-len 32 func-bits 16` to match the post's SID layout.
- Non-code diagrams/lists were marked as `javascript` fenced blocks. These were changed to `text` fences so they are not presented as JavaScript examples.

## Review Notes
The post now uses one explicit 16/32/16/64 SID allocation scheme for illustration. RFC 8986 allows flexible locator, function, and argument lengths, and FRR has defaults that differ unless `block-len`, `node-len`, and `func-bits` are set explicitly.
