# Validation Summary: How to Use HELLO in Redis for Protocol Negotiation (RESP3)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (6.0+, with notes on 6.2+ for argumentless HELLO)
- HELLO command
- RESP3 protocol
- redis-py (Python Redis client)

## Sources Consulted
- Official Redis HELLO command documentation: https://redis.io/docs/latest/commands/hello/
- Redis protocol specification (RESP3): https://redis.io/docs/latest/develop/reference/protocol-spec/
- redis-py PyPI page and changelog: https://pypi.org/project/redis/

## Issues Found
1. **Incorrect format label on example output (line 31)**: The example output was labeled "(in RESP3 format)" but the output shows `proto: 2` (RESP2) and uses RESP2 flat array display. Changed to "(as displayed by redis-cli)".

2. **Incorrect claim about redis-py auto-using RESP3 (line 92)**: The post stated "Modern clients like redis-py 4.x automatically use RESP3 when available." This is wrong on two counts: (a) RESP3 support was added in redis-py 5.0, not 4.x, and (b) redis-py does not automatically use RESP3 — it must be explicitly enabled with `protocol=3`. The default remains RESP2. Corrected to reflect this.

3. **Misleading claim about topology info (line 110)**: The post suggested using HELLO "to get topology info" when connecting to Sentinel or Cluster. HELLO returns basic server info (mode and role fields), not topology information. Changed to "to confirm server mode and role".

4. **Missing version caveat for argumentless HELLO (line 22)**: The post stated that calling HELLO with no arguments returns connection info, but did not mention this only works since Redis 6.2. In Redis 6.0-6.1, the `protover` argument was required. Added a clarifying note.

## Review Notes
- The Python code example using `redis.Redis(protocol=3)` and `r.hello()` is correct for redis-py 5.0+.
- The RESP3 data types listed (Maps, Sets, Doubles, Verbatim strings, Push messages) are all accurate, though RESP3 also adds Booleans, Big numbers, Nulls, Bulk errors, and Attributes which are not mentioned. This is acceptable for a focused tutorial.
- The HELLO command syntax matches the official Redis documentation exactly.
