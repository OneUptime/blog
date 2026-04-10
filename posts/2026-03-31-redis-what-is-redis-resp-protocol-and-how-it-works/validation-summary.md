# Validation Summary: What Is Redis RESP Protocol and How It Works

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RESP (Redis Serialization Protocol) - versions 2 and 3
- redis-cli
- Python (socket programming)
- netcat (nc)

## Sources Consulted
- Official Redis Protocol Specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- Official Redis CLI Documentation: https://redis.io/docs/latest/develop/tools/cli/
- Official Redis HELLO Command Documentation: https://redis.io/docs/latest/commands/hello/

## Issues Found

### 1. Non-existent `redis-cli --resp` flag (Line 45)
- **What was wrong:** The text said "Use `redis-cli --resp` to see raw RESP output:" but `--resp` is not a valid redis-cli flag. The valid flags are `-2`/`--resp2` and `-3`/`--resp3`.
- **What was changed:** Updated the description to "Use `-3` with `redis-cli` to enable RESP3 protocol mode:" which accurately describes what the `-3` flag in the subsequent command does.

### 2. Misleading backward-compatibility claim (Line 73)
- **What was wrong:** The text said "RESP3 is backward-compatible and clients can negotiate which version to use at connection time." RESP3 is not backward-compatible — RESP3 responses cannot be parsed by RESP2 parsers. The Redis *server* supports both protocols, defaulting to RESP2.
- **What was changed:** Replaced with "Redis servers support both RESP2 and RESP3, and clients can negotiate which version to use at connection time via the HELLO command. Connections default to RESP2." This accurately describes the protocol negotiation mechanism.

## Review Notes
- The RESP3 data types section lists 5 types (Map, Set, Double, Blob error, Null) but omits several others introduced in RESP3: Boolean, Big Numbers, Verbatim Strings, Attributes, and Pushes. This is acceptable for an introductory post but could be expanded in the future.
- The Python RESP client example uses `len(arg)` (character count) for the bulk string length prefix rather than `len(arg.encode())` (byte count). This works correctly for ASCII strings as demonstrated but would be incorrect for non-ASCII/multibyte characters. Acceptable for a minimal example.
- The Python example uses `sock.send()` instead of `sock.sendall()`, which doesn't guarantee all bytes are sent. Acceptable for a minimal example but worth noting.
