# Validation Summary: How to Use XLEN in Redis to Get Stream Length

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis Streams
- XLEN command
- XADD command
- XDEL command
- XTRIM / MAXLEN
- XINFO GROUPS command
- XINFO STREAM command
- redis-cli

## Sources Consulted
- Redis official documentation for XLEN: https://redis.io/commands/xlen/
- Redis official documentation for XADD: https://redis.io/commands/xadd/
- Redis official documentation for XDEL: https://redis.io/commands/xdel/
- Redis official documentation for XINFO GROUPS: https://redis.io/commands/xinfo-groups/
- Redis official documentation for XINFO STREAM: https://redis.io/commands/xinfo-stream/
- Related blog posts in the same codebase (redis-xadd, redis-xdel, redis-stream-commands-cheat-sheet)

## Issues Found

1. **XDEL with mismatched ID in "empty stream" example**: The XADD used `*` (auto-generated ID based on server time) but XDEL used a hardcoded ID `1748700000000-0`. Since the auto-generated ID would not match the hardcoded one, XDEL would fail to delete the entry, and XLEN would return 1 instead of the expected 0. Fixed by changing XADD to use the explicit ID `1748700000000-0` so both commands reference the same entry.

2. **Incorrect comment on XINFO GROUPS**: The comment read `# Messages acknowledged and consumed (from a specific group)` which is misleading. XINFO GROUPS returns information including the count of pending (delivered but **not yet acknowledged**) messages per group, not acknowledged messages. Fixed the comment to: `# Consumer group info including pending (unacknowledged) messages`.

## Review Notes
- The `MAXLEN = 100` example output of `(integer) 100` implicitly assumes the stream already had 100+ entries before the XADD. This is technically correct but could be clearer with a note that MAXLEN only trims down, it doesn't pad up. Not changed since the context is sufficient.
- The XINFO STREAM output uses illustrative hardcoded IDs (`1748700000002-0`) which is acceptable for a blog example.
- All other technical claims (O(1) complexity, return value semantics, non-existent key behavior, MAXLEN syntax with `=`) are accurate per Redis documentation.
