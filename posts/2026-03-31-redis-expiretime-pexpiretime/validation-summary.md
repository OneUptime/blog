# Validation Summary: How to Use EXPIRETIME and PEXPIRETIME in Redis

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis 7.0+
- EXPIRETIME command
- PEXPIRETIME command
- EXPIREAT / PEXPIREAT commands
- TTL / PTTL commands
- GNU date (for timestamp conversion example)

## Sources Consulted
- Redis official documentation for EXPIRETIME: https://redis.io/commands/expiretime/
- Redis official documentation for PEXPIRETIME: https://redis.io/commands/pexpiretime/
- Redis official documentation for TTL: https://redis.io/commands/ttl/
- Redis official documentation for PTTL: https://redis.io/commands/pttl/
- Redis official documentation for EXPIREAT: https://redis.io/commands/expireat/
- Unix timestamp verification for 1751328000 (Jul 1, 2025 00:00:00 UTC)

## Issues Found
No technical issues found.

## Review Notes
- The `date -d @1751328000` command on line 134 uses GNU date syntax, which works on Linux but not on macOS (which uses `date -r 1751328000`). This is acceptable since Redis servers typically run on Linux, but readers on macOS should be aware of the difference.
- The Unix timestamp 1751328000 was manually verified to correspond to Tuesday, July 1, 2025 00:00:00 UTC, matching the post's stated output.
- All return value semantics (-1 for no expiry, -2 for nonexistent key) are consistent with official Redis documentation and match the behavior of TTL/PTTL.
- The claim that EXPIRETIME and PEXPIRETIME were introduced in Redis 7.0 is accurate.
