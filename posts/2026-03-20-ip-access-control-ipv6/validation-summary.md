# Validation Summary: How to Configure IP-Based Access Control with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and CIDR notation
- Python `ipaddress`
- Redis / `redis-py`
- `curl`
- IP-based access control and rate limiting

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html
- curl tutorial: https://curl.se/docs/tutorial.html
- curl URL syntax reference: https://curl.se/docs/url-syntax.html
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- Redis `EXPIRE` command reference: https://redis.io/docs/latest/commands/expire/

## Issues Found
- The original `get_rate_limit_key()` example handled IPv4-mapped IPv6 addresses as native IPv6. In Python's `ipaddress` module, that caused values like `::ffff:192.168.1.1` to be grouped under an IPv6 `/64` such as `::/64`, which incorrectly merges unrelated IPv4 clients. I updated the code to detect `IPv6Address.ipv4_mapped` and use the embedded IPv4 address for the rate-limit key.
- The testing section described the IPv6 literal in the URL as a client address, but in `curl` the URL host is the server endpoint being contacted. I corrected the wording and updated the examples to use `-g` with bracketed IPv6 URLs, which matches curl's documented literal IPv6 URL handling.

## Review Notes
The Redis example uses a simple `INCR` plus `EXPIRE` pattern for illustrative rate limiting. It is technically valid for a basic example, but production implementations may want stricter fixed-window or sliding-window semantics depending on enforcement requirements.
