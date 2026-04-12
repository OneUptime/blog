# Validation Summary: How to Use XINFO in Redis to Get Stream and Group Information

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (7.0+ Streams features)
- Redis CLI (`redis-cli`)
- Python (`redis-py` library)
- Redis Streams, Consumer Groups, XINFO subcommands

## Sources Consulted
- Redis official documentation: XINFO CONSUMERS — https://redis.io/docs/latest/commands/xinfo-consumers/
- Redis official documentation: XINFO GROUPS — https://redis.io/docs/latest/commands/xinfo-groups/
- Redis official documentation: XINFO STREAM — https://redis.io/docs/latest/commands/xinfo-stream/
- Redis official documentation: XGROUP CREATE — https://redis.io/docs/latest/commands/xgroup-create/
- redis-py library API (xinfo_stream, xinfo_groups, xinfo_consumers methods)

## Issues Found

1. **Incorrect `inactive` field description (XINFO CONSUMERS section)**
   - **What was wrong:** The post described `inactive` as "milliseconds since last acknowledged message," implying it tracks XACK operations.
   - **What was changed:** Corrected to "milliseconds since last successful interaction."
   - **Why:** Per Redis docs, `inactive` tracks the time since the consumer's last *successful* interaction (e.g., XREADGROUP that actually read entries, XCLAIM/XAUTOCLAIM that actually claimed entries). It has nothing to do with XACK/acknowledgment.

2. **Imprecise `idle` field description (XINFO CONSUMERS section)**
   - **What was wrong:** The post described `idle` as "milliseconds since last interaction."
   - **What was changed:** Corrected to "milliseconds since last attempted interaction."
   - **Why:** Since Redis 7.2.0, `idle` specifically tracks *attempted* interactions while `inactive` tracks *successful* ones. The distinction between "attempted" and "successful" is the entire reason both fields exist, so the description should be precise.

3. **Incorrect `entries-read` value in XINFO GROUPS sample output**
   - **What was wrong:** The `entries-read` field for the `processors` group showed `(integer) 0`.
   - **What was changed:** Corrected to `(integer) 2`.
   - **Why:** The `processors` group was created with `$` as the starting ID, which resolves to the stream's last entry. In Redis 7.0+, this sets `entries-read` to the stream's current `entries-added` value (2), since the group is logically past all existing entries. The previous value of 0 was also inconsistent with `lag` being 0 — if `entries-read` were 0 and `entries-added` were 2, lag would be 2, not 0.

## Review Notes
- The `inactive` field in XINFO CONSUMERS output was added in Redis 7.2.0. The post doesn't mention version requirements, which could be noted in a future update.
- The `entries-read`, `lag`, `max-deleted-entry-id`, `entries-added`, and `recorded-first-entry-id` fields require Redis 7.0+. A brief version note could help readers on older Redis versions.
- The Python examples are well-structured and use correct redis-py APIs. The use of `decode_responses=True` is appropriate for the string-based access patterns shown.
- The `lag` field can be NULL in certain edge cases (e.g., entries deleted between `last-delivered-id` and the stream tail). The lag monitor example handles this with `.get('lag', 0)` which would treat NULL as 0 — acceptable for a monitoring use case but worth noting.
