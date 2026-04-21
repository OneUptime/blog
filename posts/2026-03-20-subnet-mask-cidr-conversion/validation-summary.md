# Validation Summary: How to Convert Subnet Mask to CIDR Notation and Back

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Python `ipaddress` standard library module
- IPv4 subnet masks
- CIDR prefix notation
- IPv4 wildcard/host masks

## Sources Consulted
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 3021, "Using 31-Bit Prefixes on IPv4 Point-to-Point Links": https://datatracker.ietf.org/doc/html/rfc3021
- RFC 4632, "Classless Inter-domain Routing (CIDR)": https://www.rfc-editor.org/rfc/rfc4632.html

## Issues Found
- `ipaddress.IPv4Network(f"0.0.0.0/{mask}")` accepts both dotted-decimal net masks and host masks. For example, Python treats `0.0.0.255` as equivalent to `/24`, even though it is a host/wildcard mask rather than a subnet mask. Updated `mask_to_cidr()` and `is_valid_mask()` to compare the input with `net.netmask`, so host-mask patterns are rejected when validating dotted-decimal subnet masks.
- Updated the conclusion to avoid implying that `IPv4Network` only accepts subnet masks. It now notes that the library validates contiguous net masks and host masks, and that callers should compare against `.netmask` when they need subnet-mask-only validation.

## Review Notes
The remaining examples are technically correct. Python's `ipaddress` documentation supports `.prefixlen`, `.netmask`, `.hostmask`, `strict=False`, and the `/31` and `/32` usable-host behavior shown in the post. RFC 3021 supports the special handling of `/31` point-to-point networks.
