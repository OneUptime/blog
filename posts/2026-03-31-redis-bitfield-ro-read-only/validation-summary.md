# Validation Summary: How to Use BITFIELD_RO in Redis for Read-Only Bit Field Access

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (6.0+)
- BITFIELD_RO command
- BITFIELD command
- Redis read replicas / cluster routing
- Redis bitmaps and bit field encoding types (u8, u16, i16)

## Sources Consulted
- Redis official documentation for BITFIELD_RO: https://redis.io/docs/latest/commands/bitfield_ro/
- Redis official documentation for BITFIELD: https://redis.io/docs/latest/commands/bitfield/
- Redis command metadata (`since` field confirms 6.0.0 availability)

## Issues Found
1. **"compile-time rejection" in comparison table (line 94)**: The table described BITFIELD_RO's rejection of SET/INCRBY subcommands as "compile-time rejection." This is incorrect — Redis rejects invalid subcommands at parse time when the server processes the command, not at compile time. Changed to "parse-time rejection."

## Review Notes
- The claim that BITFIELD_RO "does not trigger keyspace notifications or replication events" is logically sound (read-only commands do not modify data, so they would not generate these events) but is not explicitly stated in the official Redis documentation. The claim is kept as-is since it follows directly from the command's read-only nature.
- There is a known inconsistency in the Redis documentation: the `since` metadata field says 6.0.0, but the description body text on redis.io mentions "Since Redis 6.2." The blog's claim of Redis 6.0 aligns with the authoritative `since` metadata field.
- The bit field layout in the setup example (u8 at offset 0, u16 at offset 8, u8 at offset 24) is correctly non-overlapping, and the expected output values (15, 3200, 5) are accurate.
- The blog uses "type" instead of "encoding" in the syntax section, which is a minor terminology difference from the official docs but is commonly used and clear in context.
