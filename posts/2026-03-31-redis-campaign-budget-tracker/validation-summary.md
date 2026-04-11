# Validation Summary: How to Build a Campaign Budget Tracker with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, Lua scripting, pipelines, key expiration)
- Python (redis-py client library)

## Sources Consulted
- Redis HSET documentation: https://redis.io/commands/hset
- Redis HGET documentation: https://redis.io/commands/hget
- Redis HINCRBY documentation: https://redis.io/commands/hincrby
- Redis HINCRBYFLOAT documentation: https://redis.io/commands/hincrbyfloat
- Redis EVAL (Lua scripting) documentation: https://redis.io/commands/eval
- Redis INCR / INCRBY documentation: https://redis.io/commands/incrby
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Python datetime module documentation: https://docs.python.org/3/library/datetime.html

## Issues Found

1. **Bug: `r.incr(hour_key)` should be `r.incrby(hour_key, cost_cents)` in `within_hourly_pace`**
   - **What was wrong:** The function checks whether `spent_this_hour + cost_cents` exceeds the hourly cap, but then only increments the hourly spending counter by 1 (via `r.incr`), not by the actual cost amount. This means the hourly pacing tracker would drastically undercount actual spending, allowing massive overspending relative to the hourly cap.
   - **What was changed:** Replaced `r.incr(hour_key)` with `r.incrby(hour_key, cost_cents)` so the hourly counter correctly tracks the actual amount spent.

2. **Unused import: `time` in `seconds_until_midnight`**
   - **What was wrong:** The `seconds_until_midnight` function imported both `time` and `datetime`, but only `datetime` was used.
   - **What was changed:** Removed the unused `time` import, changing `import time, datetime` to `import datetime`.

## Review Notes
- The Lua script uses `HINCRBYFLOAT` for values described as integer cents. While this works correctly, `HINCRBY` would be more semantically appropriate for integer-only arithmetic and would avoid any potential floating-point representation issues. The current code is internally consistent (the `get_budget_status` function reads the value back with `float()`), so this is a style preference rather than a bug.
- The `within_hourly_pace` function has a read-then-write race condition (reads `spent_this_hour`, then increments in separate commands). Under high concurrency, multiple requests could read the same value before any increment, allowing the hourly cap to be exceeded. The post correctly uses a Lua script for the main budget check (which is the critical path), so this is a design limitation rather than a bug, but worth noting for production use.
- The hourly pacing logic in `get_hourly_cap` divides the total daily budget by remaining hours rather than the remaining budget by remaining hours. This means late in the day, the hourly cap could be higher than the actual remaining budget. The Lua-based daily budget check still enforces the hard limit, so overspending is prevented, but pacing could be smoother with remaining-budget-aware calculations.
