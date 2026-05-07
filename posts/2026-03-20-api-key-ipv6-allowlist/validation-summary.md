# Validation Summary: How to Handle IPv6 in API Key Allowlists

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4-mapped IPv6 addresses
- CIDR
- Python `ipaddress`
- `redis-py`
- `curl`
- API key allowlists
- Rate limiting

## Sources Consulted
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- curl manpage: https://curl.se/docs/manpage.html
- redis-py documentation: https://redis.readthedocs.io/en/stable/

## Issues Found
- The post said a `/64` IPv6 subnet contains "trillions" of addresses. That was incorrect. A `/64` leaves 64 host bits, which is `2^64` addresses, or about 18 quintillion. The wording was corrected in the key considerations list and conclusion.
- The rate-limiting example did not actually handle IPv4-mapped IPv6 addresses correctly. `::ffff:192.168.1.1` was being bucketed as IPv6 and grouped into a `/64`, which contradicted the post's normalization guidance. The code now converts mapped addresses to plain IPv4 before generating the rate-limit key.
- The conclusion previously stated `/64` handling too absolutely. It was adjusted to say that `/64`-level policy is often used, which is more technically accurate for operational guidance.

## Review Notes
- The `curl -6` commands are syntactically valid, and bracketed IPv6 literals in URLs are correct.
- The Redis example uses a simple `INCR` plus `EXPIRE` pattern that works, but it resets the key TTL on each request. That is acceptable for an illustrative example, though production rate limiters often use Lua scripts or sorted-set/token-bucket approaches for stricter window semantics.
