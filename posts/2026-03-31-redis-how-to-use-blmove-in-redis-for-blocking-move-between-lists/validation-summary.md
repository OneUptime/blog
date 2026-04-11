# Validation Summary: How to Use BLMOVE in Redis for Blocking Move Between Lists

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (BLMOVE command, introduced in Redis 6.2.0)
- Python (redis-py client library)
- Redis CLI

## Sources Consulted
- Redis official documentation for BLMOVE: https://redis.io/docs/latest/commands/blmove/
- Redis official documentation for BRPOPLPUSH: https://redis.io/docs/latest/commands/brpoplpush/
- redis-py source code (`redis/commands/core.py`) for `blmove()` method signature

## Issues Found

### 1. Incorrect comment describing pop direction (line 39)
- **What was wrong:** Comment said "Move from right of inbox to left of processing" but the command uses `LEFT LEFT`, which pops from the left side.
- **What was changed:** Updated comment to "Move from left of inbox to left of processing".
- **Why:** The comment contradicted the actual command behavior. `BLMOVE inbox processing LEFT LEFT 5` pops from the LEFT of inbox, not the right.

### 2. Wrong parameter order in Python `blmove()` calls (lines 79, 132, 150)
- **What was wrong:** The blog used `r.blmove('pending', 'processing', 'LEFT', 'LEFT', timeout=0)`, passing direction strings as the 3rd and 4th positional arguments. In the redis-py client, the method signature is `blmove(first_list, second_list, timeout, src="LEFT", dest="RIGHT")` — `timeout` is the 3rd positional parameter, not `src`.
- **What was changed:** All three calls were corrected to put timeout as the 3rd argument: e.g., `r.blmove('pending', 'processing', 0, 'LEFT', 'LEFT')`.
- **Why:** The original code would raise `TypeError: blmove() got multiple values for argument 'timeout'` because `'LEFT'` was passed positionally as `timeout`, and then `timeout=0` was passed as a keyword argument for the same parameter.

## Review Notes
- The `recover_stuck_jobs()` function uses `rpoplpush()`, which is deprecated in Redis 6.2 (the same version that introduced BLMOVE/LMOVE). It still works but could be updated to use `lmove('processing', 'pending', 'RIGHT', 'LEFT')` for consistency with the rest of the post. Not changed since it is functional and not technically incorrect.
- The Redis CLI command syntax throughout the post correctly matches the official Redis BLMOVE syntax.
- The BRPOPLPUSH equivalence section correctly identifies `BLMOVE source dest RIGHT LEFT timeout` as the equivalent of `BRPOPLPUSH source dest timeout`.
- The circular buffer example correctly demonstrates using the same key for source and destination.
