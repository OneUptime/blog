# Validation Summary: How to Understand IPv6 Fragment Header Fields

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 Fragment Header
- IPv6 fragmentation and reassembly
- Python
- Python `struct` module

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://datatracker.ietf.org/doc/html/rfc8200
- RFC 6946, "Processing of IPv6 'Atomic' Fragments": https://datatracker.ietf.org/doc/html/rfc6946
- RFC 7739, "Security Implications of Predictable Fragment Identification Values": https://datatracker.ietf.org/doc/html/rfc7739
- Python standard library documentation for `struct`: https://docs.python.org/3/library/struct.html
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml

## Issues Found
- The post said the Fragment Header `Next Header` field was the "original next header", which was imprecise. I changed it to the first header in the original packet's Fragmentable Part, matching RFC 8200.
- The post described `Identification` uniqueness as applying to a `(source, destination, next-header)` tuple. RFC 8200 and RFC 7739 define the relevant uniqueness scope using the source and destination addresses plus the Fragment Identification, so I corrected the text accordingly.
- The post described the uniqueness window as approximately 60 seconds maximum. RFC 8200 defines "recently" as the maximum likely packet lifetime, including time awaiting reassembly, so I replaced the hardcoded time claim with the RFC wording.
- The post described an offset-0, `M=0` fragment as just a single-fragment packet. I corrected this to the RFC 6946/RFC 8200 atomic-fragment behavior and noted that sources must not create whole-datagram fragments.
- The fragment-building example comment claimed a `3000`-byte UDP payload fragmented at a `1480`-byte boundary while only showing two headers with the second fragment starting at offset `1448`. That example description was inconsistent, so I changed the comments to describe the example accurately without implying an incorrect fragmentation layout.

## Review Notes
- The Python examples are syntactically correct and execute as written with the current Python `struct` API.
- The code focuses on parsing and building the 8-byte Fragment Header itself; it does not attempt to build or validate complete IPv6 packets, which is appropriate for the scope of this post.
