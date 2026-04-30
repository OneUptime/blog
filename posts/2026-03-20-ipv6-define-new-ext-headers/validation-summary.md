# Validation Summary: How to Define New IPv6 Extension Headers and Options

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 extension headers
- IPv6 Hop-by-Hop and Destination Options
- IANA IPv6 parameter registries
- IETF RFC process
- Python

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- RFC 7045: Transmission and Processing of IPv6 Extension Headers — https://www.rfc-editor.org/rfc/rfc7045
- RFC 4727: Experimental Values In IPv4, IPv6, ICMPv4, ICMPv6, UDP, and TCP Headers — https://www.rfc-editor.org/rfc/rfc4727
- RFC 6564: A Uniform Format for IPv6 Extension Headers — https://www.rfc-editor.org/rfc/rfc6564
- RFC 9098: Operational Implications of IPv6 Packets with Extension Headers — https://www.rfc-editor.org/rfc/rfc9098
- RFC 9673: IPv6 Hop-by-Hop Options Processing Procedures — https://www.rfc-editor.org/rfc/rfc9673
- IANA Internet Protocol Version 6 (IPv6) Parameters registry — https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml

## Issues Found
- The post said new extension headers require a Standards Track RFC. I corrected this to the actual IANA allocation policy of `Standards Action or IESG Approval`, and added the RFC 8200 requirement to explain why existing headers or options cannot be used.
- The Option Type action-bit descriptions for the `10` and `11` ranges were reversed. I corrected both the prose and the Python `action_codes` mapping to match RFC 8200.
- The option-design example claimed `0x1F` was an experimental value. I corrected this to the RFC 4727 experimental `rest` value `11110`, which yields the experimental full Option Types `0x1E`, `0x3E`, `0x5E`, `0x7E`, `0x9E`, `0xBE`, `0xDE`, and `0xFE` depending on the action and change bits.
- The experimental extension-header section implied that `253` and `254` are also experimental option-type values. I corrected this to explain that `253` and `254` are experimental Next Header values, while RFC 4727 defines separate experimental Option Types for Destination Options and Hop-by-Hop options.
- The Hop-by-Hop risk wording said HbH headers cause CPU exhaustion in routers. I tightened this to the standards-based wording that they can trigger slow-path or control-plane processing and create denial-of-service risk.
- The experimental header Python snippet was missing `import struct` and used an argument that could not actually be encoded in the returned header body. I added the import and simplified the example so it reflects how IPv6 header chaining really works.

## Review Notes
- RFC 9673 updates Hop-by-Hop processing behavior for routers. The revised wording is consistent with that newer guidance.
- The mention of encoding information in IPv6 address bits is context-dependent and is only appropriate when the information is genuinely part of the addressing design.
