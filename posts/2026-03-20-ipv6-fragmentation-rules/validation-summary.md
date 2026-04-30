# Validation Summary: How to Understand IPv6 Fragmentation Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4
- ICMPv6
- Path MTU Discovery
- IP fragmentation
- Python

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201: Path MTU Discovery for IP version 6 — https://www.rfc-editor.org/rfc/rfc8201
- RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc4443
- RFC 6946: Processing of IPv6 "Atomic" Fragments — https://www.rfc-editor.org/rfc/rfc6946
- RFC 7739: Security Implications of Predictable Fragment Identification Values — https://www.rfc-editor.org/rfc/rfc7739
- RFC 8021: Generation of IPv6 Atomic Fragments Considered Harmful — https://www.rfc-editor.org/rfc/rfc8021
- RFC 8900: IP Fragmentation Considered Fragile — https://www.rfc-editor.org/rfc/rfc8900
- Python Standard Library: `secrets` — https://docs.python.org/3/library/secrets.html

## Issues Found
- The PMTU section said the source must always perform PMTUD and said the initial PMTU assumption was the minimum of local interface MTUs. I corrected this to match RFC 8201: PMTUD is strongly recommended for efficiency, the initial PMTU estimate is the first-hop MTU, and nodes that omit PMTUD must stay at or below 1280 bytes.
- The Fragment Header description was too simplified. I corrected it to show that the Fragment Header is inserted after the per-fragment headers and clarified that the first fragment must contain the extension-header chain through the upper-layer header.
- The IPv4/IPv6 comparison table used inaccurate wording around transit fragmentation and the minimum MTU terminology. I corrected it to distinguish IPv4 router fragmentation from IPv6 source-only fragmentation and to use minimum link MTU wording.
- The Python fragmenter example did not account for per-fragment header overhead when computing fragment size and documented the return value incorrectly. I corrected the sizing logic, added a guard for invalid MTU/header combinations, and fixed the return description.
- The Python example used a simple sequential Identification counter while the text later recommended less predictable Identification handling. I updated the example to use random-initialized per-(source, destination) counters, which better reflects RFC 7739 guidance while preserving uniqueness semantics.
- The Fragment Identification section incorrectly stated uniqueness against a `(source, destination, next-header)` triple. I corrected it to the `(source, destination)` scope used by RFC 8200 and clarified the reassembly-time implications.
- The atomic fragments section contained outdated behavior and an unrelated Linux `use_tempaddr` command. I replaced it with current RFC 6946, RFC 8200, and RFC 8021 guidance on atomic fragment processing and generation.

## Review Notes
- RFC 8200 discourages relying on IPv6 fragmentation when the application or transport can adapt packet size to the measured PMTU.
- RFC 8200 only requires nodes to accept fragmented packets that reassemble to 1500 bytes unless larger reassembly support is known. The post is still technically correct without this detail, but it could be a useful future addition.
