# Validation Summary: How to Implement Loops in Redis Lua Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lua scripting via EVAL)
- Lua 5.1 (embedded in Redis)
- Redis CLI

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- Lua 5.1 Reference Manual (control structures): https://www.lua.org/manual/5.1/manual.html#2.4.4
- Redis SCRIPT KILL documentation: https://redis.io/docs/latest/commands/script-kill/
- Redis configuration (lua-time-limit): https://redis.io/docs/latest/develop/interact/programmability/eval-intro/#script-flags

## Issues Found

### Issue 1: Data loss bug in "Avoid Infinite Loops" example
- **What was wrong:** The `while true` loop called `redis.call('LPOP', KEYS[1])` to pop an item (removing it from the list), then checked `count >= MAX_ITERATIONS` in the same `if` condition. When the iteration limit was reached, the already-popped item would be silently discarded — removed from the source list but never processed.
- **What was changed:** Restructured the loop to use `while count < MAX_ITERATIONS do` so the iteration limit is checked before popping. The `not item` break condition remains inside the loop to handle an empty list.
- **Why:** The original pattern caused data loss. By checking the count limit as the loop condition (before LPOP), no item is ever popped without being processed.

### Issue 2: Incorrect description of `lua-time-limit` behavior
- **What was wrong:** The post stated "If a script runs longer than `lua-time-limit` (default 5 seconds), Redis kills it." Redis does NOT automatically kill scripts that exceed `lua-time-limit`.
- **What was changed:** Replaced with an accurate description: Redis starts rejecting other client commands with a BUSY error, and an administrator must manually run `SCRIPT KILL` (if no writes were performed) or `SHUTDOWN NOSAVE` to stop the script.
- **Why:** The original claim could mislead readers into thinking Redis provides automatic protection against long-running scripts. In reality, manual intervention is required, making the advice about adding iteration caps even more important.

## Review Notes
- The `repeat-until` example correctly relies on Lua's special scoping rule where locals declared inside a `repeat` block are visible in the `until` condition. This is correct but may surprise readers unfamiliar with Lua; a brief note could be helpful in a future revision.
- The `pairs` example returns fields in non-deterministic order (Lua table iteration order is undefined for hash parts). This is technically correct but worth noting for readers who expect consistent ordering.
- Redis 7.0+ introduced Redis Functions as a preferred alternative to EVAL scripts. All examples in this post use EVAL, which remains supported but the post could mention Functions as a modern alternative in a future update.
