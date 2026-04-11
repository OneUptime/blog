# Validation Summary: How to Use HSCAN in Redis to Iterate Over Hash Fields

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (HSCAN command, SCAN family)
- redis-cli (command-line interface)
- redis-py (Python Redis client, `hscan_iter` helper)
- Bash scripting for Redis iteration

## Sources Consulted
- Official Redis HSCAN documentation: https://redis.io/docs/latest/commands/hscan/
- Official Redis SCAN documentation (HSCAN shares the same semantics): https://redis.io/docs/latest/commands/scan/
- Official Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- Official Redis HGETALL documentation: https://redis.io/docs/latest/commands/hgetall/
- redis-py documentation for `hscan_iter`: https://redis-py.readthedocs.io/en/stable/

## Issues Found
1. **Bash script missing `--raw` flag on `redis-cli`** (line 75): Without `--raw`, `redis-cli` outputs formatted/human-readable text (e.g., `1) "0"` instead of plain `0`). The script used `head -1` to extract the cursor, which would capture `1) "0"` rather than `0`, causing the termination check `[ "$cursor" = "0" ]` to never be true. This would result in an infinite loop or invalid cursor errors on subsequent calls. Fixed by adding `--raw` to the `redis-cli` invocation.

## Review Notes
- The Python code example uses a `text` code fence instead of `python`. This is a stylistic choice, not a technical error, so it was not changed.
- The post correctly notes that MATCH filtering is applied after fetching, that COUNT is a hint, and that duplicates can occur during rehash — these are important caveats that are often missed in HSCAN tutorials.
- The 10,000-field threshold in the HSCAN vs HGETALL decision flowchart is a reasonable guideline, though the actual threshold depends on latency requirements and Redis server load.
