# Validation Summary: How to Detect Brute Force Attacks from IPv6 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- Python `ipaddress`
- Redis and `redis-py`
- `curl`
- OneUptime monitoring

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Redis `redis-py` guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Redis pipelines and transactions: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- Redis `INCR` command docs: https://redis.io/docs/latest/commands/incr/
- Redis `EXPIRE` command docs: https://redis.io/docs/latest/commands/expire/
- curl URL syntax documentation: https://curl.se/docs/url-syntax.html
- RFC 4291, *IP Version 6 Addressing Architecture*: https://www.rfc-editor.org/rfc/rfc4291
- RFC 7421, *Analysis of the 64-bit Boundary in IPv6 Addressing*: https://www.rfc-editor.org/rfc/rfc7421
- RFC 3849, *IPv6 Address Prefix Reserved for Documentation*: https://www.rfc-editor.org/rfc/rfc3849.html
- OneUptime IP Monitor docs: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime Website Monitor docs: https://oneuptime.com/docs/monitor/website-monitor

## Issues Found
- The Redis rate-limit example treated IPv4-mapped IPv6 addresses as native IPv6 keys. That contradicted the post's own normalization guidance and caused mapped addresses such as `::ffff:192.168.1.1` to collapse under an IPv6 `/64` key instead of using an IPv4 key. I updated `get_rate_limit_key()` to detect `IPv6Address.ipv4_mapped` and return an IPv4 rate-limit key.
- The post said a `/64` IPv6 subnet contains "trillions" of addresses. A `/64` contains `2^64` addresses, which is about 18 quintillion. I corrected that wording in the key considerations and conclusion.
- The first `curl` test comment said it tested "with IPv6 client address". `curl -6` selects IPv6 resolution and transport behavior, but that comment overstated what the flag itself guarantees. I changed the comment to say it tests an endpoint over IPv6.

## Review Notes
- The `curl` commands are syntactically correct and use the required bracketed form for literal IPv6 hosts. The `2001:db8::/32` example address is a documentation prefix reserved by RFC 3849, so readers still need to replace it with a reachable endpoint in practice.
- The Redis pipeline example is acceptable as written because redis-py pipelines execute as transactions by default. The logic still behaves as a simple rolling-window counter because `EXPIRE` is refreshed on each request.
- The post references Fail2Ban in the title, tags, description, and overview, but it does not include a Fail2Ban-specific configuration example. That is a completeness issue rather than a technical correctness issue.
