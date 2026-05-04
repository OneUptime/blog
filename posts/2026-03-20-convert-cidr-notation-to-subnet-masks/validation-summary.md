# Validation Summary: How to Convert CIDR Notation to Subnet Masks

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- IPv4 networking / CIDR notation / subnet masks
- Python 3 standard library: `socket`, `struct`, `ipaddress`

## Sources Consulted
- RFC 4632 — Classless Inter-Domain Routing (CIDR): https://datatracker.ietf.org/doc/html/rfc4632
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` module documentation (`inet_ntoa`, `inet_aton`): https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- Executed every Python snippet locally with Python 3 to confirm output values.

## Issues Found
- Adjusted the displayed output of the `cidr_to_dotted` table so the spacing matches what the Python code actually prints. The mask values themselves were already correct; only the column widths/alignment needed updating to match the f-string formatting (`>8`, `>18`, `<7`).

## Review Notes
- The bit-shift formula `(0xFFFFFFFF >> (32 - prefix)) << (32 - prefix)` is correct for prefixes in the range 0–32 in Python (Python's arbitrary-precision integers handle the edge case `prefix == 0` cleanly because `0xFFFFFFFF >> 32 == 0`). In a fixed-width language like C this would be undefined behavior at the boundaries, but the post is Python-specific so this is fine.
- `mask_to_prefix` counts all 1-bits via `bin(mask_int).count("1")`. For a valid (contiguous) subnet mask this is equivalent to counting leading 1-bits, so the function is correct, though the inline comment "Count leading 1-bits" describes intent rather than the literal operation. Acceptable as written.
- `mask_to_prefix` reuses `socket` and `struct` imports from the earlier code block; this is a common blog-post convention and not a bug.
- The "critical octet" set listed in Key Takeaways (128, 192, 224, 240, 248, 252, 254, 255) is correct; 0 is the only other legal mask-octet value and only appears in fully-zero (host) octets.
- `ipaddress.IPv4Network(..., strict=False)` is the right choice when accepting host-bit-set inputs like `10.0.0.5/22`; verified against the Python docs.
- All numeric examples (e.g., `/22` → 1022 usable hosts, `/20` → 255.255.240.0, binary expansions) verified.
