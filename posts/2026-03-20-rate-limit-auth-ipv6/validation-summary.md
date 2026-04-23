# Validation Summary: How to Handle IPv6 in Rate Limiting for Auth Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python `ipaddress`
- Redis rate limiting patterns
- `redis-py` pipelines
- IPv6 addressing and prefixes
- `curl` IPv6 URL handling
- Authentication endpoint security

## Sources Consulted
- Python `ipaddress` docs: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://datatracker.ietf.org/doc/html/rfc7421
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986
- Redis `INCR` docs and rate limiter patterns: https://redis.io/docs/latest/commands/incr/
- Redis `EXPIRE` docs: https://redis.io/docs/latest/commands/expire/
- redis-py advanced features and pipeline behavior: https://redis.readthedocs.io/en/stable/advanced_features.html
- everything curl, host syntax for IPv6 literals: https://everything.curl.dev/cmdline/urls/host.html
- everything curl, URL globbing behavior: https://everything.curl.dev/cmdline/urls/globbing.html
- OneUptime product site: https://oneuptime.com/

## Issues Found
- The Redis example said IPv4-mapped IPv6 addresses must be normalized, but `get_rate_limit_key()` did not actually do that. As written, an address like `::ffff:192.168.1.1` would be treated as IPv6 and grouped into an incorrect `/64` key. I updated the function to normalize mapped addresses before generating the rate-limit key.
- The rate-limit example reset the Redis TTL on every request for the same key. That does not enforce a normal fixed `window` limit and can let counts accumulate indefinitely under sustained traffic. I changed the example to use a time-bucketed key so the counter resets correctly for each window.
- The testing comments referred to an "IPv6 client address", but the `curl` commands are specifying IPv6 destination endpoints in the URL. I corrected those comments.
- The post described a `/64` as containing "trillions" of addresses. A `/64` contains `2^64` addresses, which is about 18 quintillion. I corrected that wording in the IPv6 considerations and conclusion.

## Review Notes
- The revised Redis example is a fixed-window limiter. Production authentication limits are often combined with username, account, or device-based controls to reduce false positives from shared IPv6 egress.
- Aggregating native IPv6 traffic at `/64` is a common operational choice because clients can rotate interface identifiers within the same prefix, but the right grouping can still depend on the network environment.
