# Validation Summary: How to Understand Unique-Local Addresses (fc00::/7) - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- IPv6 Unique-Local Addresses (ULA)
- RFC 4193
- Python (hashlib, ipaddress, os, time)
- iproute2 (`ip -6`)
- ip6tables (netfilter)
- BGP route-map syntax (Cisco/IOS style)
- radvd / systemd-networkd (mentioned)

## Sources Consulted
- RFC 4193 - "Unique Local IPv6 Unicast Addresses" (https://www.rfc-editor.org/rfc/rfc4193)
- RFC 4291 - "IP Version 6 Addressing Architecture" (for Global Unicast 2000::/3 scope)
- Python 3 standard library: `hashlib`, `ipaddress`, `os`, `time` documentation
- iproute2 `ip address` help output (verified locally)
- `ip6tables` v1.8.10 help output (verified locally)
- RFC 6177 / RFC 6296 (NPTv6 context for NAT/ULA to Global Unicast)

## Issues Found
No technical issues found. The post's key claims check out:

- fc00::/7 correctly identified as the full ULA block, with fc00::/8 (L=0) reserved/not currently defined and fd00::/8 (L=1) for locally assigned prefixes per RFC 4193 §3.1.
- The bit layout (8-bit prefix / 40-bit Global ID / 16-bit Subnet ID / 64-bit Interface ID = 128 bits total) matches RFC 4193 §3.
- The Python generator follows RFC 4193 §3.2.2 steps (time + system ID, SHA-1, least-significant 40 bits as Global ID, prepend fd). I ran the code: it produces valid /48 prefixes like `fd16:daaa:0945::/48`. The bit arithmetic `(0xfd << 120) | (global_id << 80)` correctly places the 0xfd prefix byte and the 40-bit Global ID into the upper 48 bits.
- `ip -6 addr add <prefix>/64 dev <iface>` is correct iproute2 syntax.
- `ip6tables -A FORWARD -s fc00::/7 -o <iface> -j DROP` is valid and correctly filters the entire ULA range (both fc00::/8 and fd00::/8).
- ULA vs Global Unicast comparison table is accurate.

## Review Notes
- The post's description of fc00::/8 as "Centrally assigned (not yet defined)" reflects a historical IETF draft proposal; RFC 4193 itself only reserves L=0 for future definition without mandating central assignment. This is a widely used description and is acceptable as-is.
- The Python example intentionally uses `os.urandom(8)` as a "random fallback" instead of an actual EUI-64, which the comment acknowledges. This is a reasonable simplification for a tutorial.
- The `time.time() * 1e7` value is not strictly 64-bit NTP format as specified in RFC 4193 §3.2.2 step 1, but the algorithm's goal is just entropy input into SHA-1, so the deviation does not affect correctness of the generated prefix.
- The ASCII-art structure diagram's `└─ subnet` label is placed under the `::/48` portion, which is slightly ambiguous (the subnet ID field actually lives in bits 48-63 after the /48 prefix). This is a minor cosmetic/labeling nit rather than a technical error and was left unchanged.
- The "Privacy: Good (not externally visible)" row is defensible in the sense that ULAs aren't reachable from the public internet, but privacy benefits are really about routing scope, not anonymity. Fine for an intro guide.
