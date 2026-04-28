# Validation Summary: How to Determine the Number of Subnets from a Given Mask

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- IPv4 subnetting and CIDR notation
- Python `ipaddress` standard library module

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4632 (Classless Inter-domain Routing) for CIDR semantics
- RFC 950 / RFC 1878 for subnet host counting conventions (network + broadcast reservation)

## Issues Found
No technical issues found.

- Formula `borrowed = new_prefix - original_prefix` and `subnets = 2^borrowed` are correct.
- Worked example for `192.168.1.0/24` → `/26` produces the four correct subnets (.0, .64, .128, .192).
- Python code uses valid, current APIs: `IPv4Network`, `prefixlen`, `subnets(new_prefix=...)`, `network_address`, `broadcast_address`. All match the documented `ipaddress` module behavior.
- Quick-reference table: every row checks out (e.g. /27 → 8 subnets, 30 hosts each = 2^5 − 2; /30 → 64 subnets, 2 hosts each = 2^2 − 2).
- /16 → /24 example: 8 borrowed bits, 256 subnets — correct.

## Review Notes
- The "hosts per subnet" formula `2**(32 - new_prefix) - 2` reserves network and broadcast addresses, which is the standard convention used in the post's examples (/24 through /30). It does not apply to /31 (RFC 3021, point-to-point links use both addresses) or /32, but the post does not cover those edge cases, so the formula is appropriate in context.
- The post is IPv4-only; this is consistent with the stated scope and tags.
