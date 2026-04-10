# Validation Summary: How to Implement Risk Scoring Engine with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (in-memory data store)
- Python (redis-py client library)
- Lua (Redis server-side scripting)
- Redis CLI (HSET command)

## Sources Consulted
- Redis SET/GET/HSET/HGET command documentation: https://redis.io/docs/latest/commands/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation (register_script, setex, incr, expire, lpush, ltrim): https://redis-py.readthedocs.io/en/stable/
- Lua 5.1 reference manual (operator precedence, tonumber): https://www.lua.org/manual/5.1/

## Issues Found
- **Signal name inconsistency**: The "Common signals" bullet list used `velocity` as the signal name, but the `HSET` weights command, and the Lua scoring script all reference `velocity_high`. There was no code to populate a key named `velocity_high`, and the mismatch would confuse readers trying to follow the tutorial end-to-end. Fixed by changing the bullet list entry from `velocity` to `velocity_high` to match the weights and Lua script.

## Review Notes
- The Lua script accesses signal keys dynamically (`risk:{user_id}:{signal}`) without declaring them in the KEYS array. This works on single-node Redis but violates Redis Cluster key-access rules. If cluster compatibility is needed, all accessed keys should be passed via KEYS. This is acceptable for a tutorial targeting single-node setups.
- The `record_failed_login` function resets the TTL to 3600 seconds on every increment, creating a sliding expiration window rather than a fixed one-hour window. This is a common and reasonable pattern, though worth noting for readers who need strict fixed-window semantics.
- All signals are treated as binary in the Lua scoring logic (`if value > 0 then add weight`). This means 1 failed login contributes the same score as 100. This is a valid design simplification for a tutorial but readers building production systems may want graduated scoring.
