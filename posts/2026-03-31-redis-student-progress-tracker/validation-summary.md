# Validation Summary: How to Build a Student Progress Tracker with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, sorted sets, bitmaps, sets)
- Python (redis-py client library)
- Redis CLI commands (HSET, ZADD, SETBIT)

## Sources Consulted
- Redis SETBIT / GETBIT / BITCOUNT documentation: https://redis.io/docs/latest/commands/setbit/
- Redis HSET / HGETALL / HKEYS documentation: https://redis.io/docs/latest/commands/hset/
- Redis ZADD / ZRANGE / ZREVRANK documentation: https://redis.io/docs/latest/commands/zadd/
- redis-py API reference: https://redis-py.readthedocs.io/en/stable/
- Python `or` operator truthiness semantics (for the rank bug)

## Issues Found

### 1. Unused `json` import
- **What was wrong:** `import json` was included in the setup but `json` is never used anywhere in the code.
- **What was changed:** Removed the unused import.
- **Why:** Dead imports are misleading and suggest json serialization is needed when it is not.

### 2. Dead code and logic bug in `complete_lesson` — module completion never computed
- **What was wrong:** The variables `start_bit` and `end_bit` were computed but never used. The comment said "Count completed lessons in this module" but no counting occurred. The `module_key` hash field was set to the overall `completion_pct` instead of a per-module percentage, contradicting the data model example that shows different values per module (e.g., `module_1 100 module_2 75 module_3 0`).
- **What was changed:** Added a pipeline of `GETBIT` calls to count completed lessons within the module's bit range, then computed a proper per-module completion percentage (`module_pct`) that is stored in the module's hash field.
- **Why:** Without this fix, every module field would contain the same overall completion percentage, making per-module tracking meaningless.

### 3. Double-counting bug in `record_quiz_score` on re-takes
- **What was wrong:** The function queued an `hset` in a pipeline, then read existing keys with `r.hkeys()` outside the pipeline. For quiz re-takes, the old score key was still present in the hash (the pipeline hadn't executed yet), and the new score was also appended to the list, causing the old score to be counted alongside the new score in the average.
- **What was changed:** Rewrote to read all existing quiz scores via `r.hgetall()` first, then update the dict with the current quiz score (overwriting any prior score for the same quiz), compute the average from the dict, and batch both `hset` and `zadd` in a single pipeline.
- **Why:** The original code produced an incorrect average score on the leaderboard whenever a student re-took a quiz.

### 4. Rank bug in `get_student_progress` — unranked students shown as rank 1
- **What was wrong:** `(rank or 0) + 1` evaluates to `1` for both `rank=0` (the top-ranked student, correct) and `rank=None` (student not on leaderboard, incorrect). Python's `or` operator treats `0` and `None` the same way since both are falsy.
- **What was changed:** Replaced with `rank + 1 if rank is not None else None` to explicitly handle the unranked case.
- **Why:** An unranked student should not appear as rank 1 on the leaderboard.

## Review Notes
- The `record_daily_activity` function accepts a `course_id` parameter but does not use it in the key, so activity is tracked globally per student rather than per course. This may be intentional but is worth noting.
- The `r.expire()` call in `record_daily_activity` resets the TTL on every call, so the set persists for 90 days after the *last* activity, not 90 days from the first. Individual set members older than 90 days are not pruned. The comment is slightly ambiguous but the behavior is reasonable.
- The `BITCOUNT` approach counts all set bits in the entire bitmap. If `lesson_index` values are sparse or non-contiguous, the count could be inaccurate. The post assumes contiguous 0-based lesson indices, which should be stated explicitly.
