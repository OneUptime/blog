# Validation Summary: How to Convert Between Binary and Decimal Subnet Masks

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv4 subnet masks (dotted-decimal notation)
- Binary representation of subnet masks
- CIDR prefix notation
- Python 3 standard library: `socket.inet_aton`, `struct.pack`/`struct.unpack`, `bin()`, f-string format specifiers

## Sources Consulted
- RFC 950 (Internet Standard Subnetting Procedure): https://datatracker.ietf.org/doc/html/rfc950
- RFC 4632 (CIDR): https://datatracker.ietf.org/doc/html/rfc4632
- Python `socket` module documentation (inet_aton): https://docs.python.org/3/library/socket.html#socket.inet_aton
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- Python format specification (binary, zero-pad): https://docs.python.org/3/library/string.html#format-specification-mini-language
- Manually executed every code snippet in a local Python 3 interpreter to verify outputs.

## Issues Found
1. **Decimal to Binary worked example used inconsistent and incorrect comparison wording.** The first three lines used `≥` with `Yes` to indicate the bit should be set, but the trailing five lines switched to `<` with `No`, e.g. `0 < 16? No → 0`. That statement is mathematically wrong: 0 IS less than 16, so the answer would be `Yes`. Changed all eight comparisons to use `≥` consistently (e.g. `0 ≥ 16? No → 0`), which preserves the original `Yes → 1 / No → 0` mapping and matches the first three lines.

2. **`is_valid_mask` bug on masks with leading zero bits.** The function used `bin(mask_int)[2:]` which strips Python's `0b` prefix but also drops leading zeros. For a mask like `0.128.0.0` (`mask_int = 0x00800000`), `bin()` returns only 24 characters — the leading 8 zero bits are missing — so the iteration begins at the leading `1` and incorrectly returns `True` even though the mask is non-contiguous. Replaced `bin(mask_int)[2:]` with `bin(mask_int)[2:].zfill(32)` so the full 32-bit pattern is always inspected. Verified the listed examples (`255.255.240.0` → True, `255.255.245.0` → False) still produce the documented results, and the previously misclassified `0.128.0.0` now correctly returns False.

## Review Notes
- The 8-bit power-of-two table (128, 64, 32, 16, 8, 4, 2, 1) and the example conversion `11110000 = 240` are correct.
- The `prefix_to_binary` shift expression `(0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF` works for all valid prefixes 0–32 in Python because Python's integers are arbitrary precision; the trailing AND truncates back to 32 bits. Verified outputs for /8, /20, /24, /26, /28, /30 match the canonical masks.
- `mask_to_binary` and `binary_to_mask` are correct round-trip inverses for valid 32-bit dotted-decimal input.
- `socket.inet_aton` accepts some legacy short forms (e.g. `"255"` is treated as `0.0.0.255`); the post does not warn about this, but it is an edge case unlikely to arise when validating user-entered subnet masks. No change made.
- The post does not explicitly state that `is_valid_mask` assumes well-formed dotted-quad input — `inet_aton` will raise `OSError` on malformed strings. This is acceptable for a tutorial, but a production helper would wrap the call in a try/except. No change made.
