# Validation Summary: How to Understand Fixed-Length Subnet Masks vs VLSM

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting
- Fixed-Length Subnet Masking (FLSM)
- Variable Length Subnet Masking (VLSM)
- Routing protocols: RIPv1, RIPv2, OSPF, EIGRP, BGP
- Python 3 standard library (`math`)

## Sources Consulted
- Python `math` module documentation: https://docs.python.org/3/library/math.html
- RFC 950, Internet Standard Subnetting Procedure: https://www.rfc-editor.org/rfc/rfc950
- RFC 1058, Routing Information Protocol: https://www.rfc-editor.org/rfc/rfc1058
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 2328, OSPF Version 2: https://www.rfc-editor.org/rfc/rfc2328
- RFC 2453, RIP Version 2: https://www.rfc-editor.org/rfc/rfc2453
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021
- RFC 4271, A Border Gateway Protocol 4 (BGP-4): https://www.rfc-editor.org/rfc/rfc4271
- RFC 7868, Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP): https://www.rfc-editor.org/rfc/rfc7868

## Issues Found
- The Python example's final line labeled the savings as `addresses`, but the calculation was based on usable host counts. I changed the output text to `usable host addresses` so the units match the code.
- The routing-protocol wording implied FLSM was tied only to classful protocols. I corrected this to note that FLSM can be used with either classful or classless protocols, while VLSM specifically requires classless routing support.
- Several takeaways used absolute wording (`eliminates`, `always`). I softened these to technically accurate phrasing because VLSM reduces rather than fully eliminates waste, and modern networks typically rather than universally use VLSM.

## Review Notes
- The Python snippet executed successfully under Python 3 as written.
- The post uses the traditional `/30` model for 2-host point-to-point links. RFC 3021 also permits `/31` on point-to-point IPv4 links; that does not make the current example wrong, but it is a useful caveat for future revisions.
