# Validation Summary: How to Log IPv6 Addresses in Authentication Audit Trails

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Python `ipaddress` module
- IPv6 addressing and URI syntax
- Redis / `redis-py` rate limiting patterns
- `curl`
- OneUptime monitoring

## Sources Consulted
- Python Standard Library: `ipaddress` — https://docs.python.org/3/library/ipaddress.html
- Python HOWTO: An introduction to the `ipaddress` module — https://docs.python.org/3/howto/ipaddress.html
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax — https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 7421: Analysis of the 64-bit Boundary in IPv6 Addressing — https://www.rfc-editor.org/rfc/rfc7421
- Redis command reference: `INCR` and rate limiter patterns — https://redis.io/docs/latest/commands/incr/
- redis-py documentation: Pipeline examples — https://redis.readthedocs.io/en/stable/examples/pipeline_examples.html
- curl man page — https://curl.se/docs/manpage.html
- OneUptime Docs: Website Monitor — https://oneuptime.com/docs/monitor/website-monitor
- OneUptime Docs: IP Monitor — https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime Product: Metrics — https://oneuptime.com/product/metrics

## Issues Found
1. The post said a `/64` IPv6 subnet contains "trillions" of addresses. A `/64` leaves 64 interface-ID bits, so it contains `2^64` addresses, about 18 quintillion. Updated the claim in the key-considerations list and conclusion.

2. The rate-limit example reset the Redis key TTL on every request while reusing the same key. That changes the behavior from a normal fixed window into a counter that only expires after an idle gap. Updated the example to use a time bucket in the key so the `INCR` + `EXPIRE` pattern matches Redis' documented fixed-window approach.

3. The rate-limit example did not normalize IPv4-mapped IPv6 addresses before generating the rate-limit key. That would group `::ffff:x.x.x.x` addresses under an IPv6 `/64` key instead of the corresponding IPv4 address. Updated the code to detect `ipv4_mapped` addresses and key them as IPv4.

4. The IPv6 URL wording and test-command comment were imprecise. Brackets are part of IPv6 literal URI syntax, not the address itself, and the original comment referred to a "client address" while the command was specifying an IPv6 literal host in the URL. Updated the wording and quoted the URLs in the `curl` examples.

## Review Notes
- The `2001:db8::/32` prefix used in the first `curl` example is the RFC 3849 documentation prefix. It is appropriate for examples but is not routable in production.
- Rate limiting at `/64` is a common anti-rotation heuristic for IPv6, but it is still a policy choice. Some environments may need a different prefix length depending on their addressing model and abuse patterns.
