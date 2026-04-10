# Validation Summary: Redis Runbook: Performing Emergency Key Deletion

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Redis (SCAN, UNLINK, DEL, KEYS, EVAL)
- redis-cli command-line tool
- Lua scripting for Redis
- Bash shell scripting

## Sources Consulted
- Redis SCAN command documentation — https://redis.io/docs/latest/commands/scan/
- Redis UNLINK command documentation — https://redis.io/docs/latest/commands/unlink/
- Redis EVAL command documentation — https://redis.io/docs/latest/commands/eval/
- Redis CLI documentation — https://redis.io/docs/latest/develop/tools/cli/

## Issues Found

### Issue 1: Misleading description of per-key sleep loop (Step 3)
- **What was wrong:** The text said "Add a small sleep between batches if needed" but the code sleeps between each individual key deletion, not between batches.
- **What was changed:** Updated the description to "Add a small sleep between each key deletion if needed" to accurately reflect the code behavior.

### Issue 2: Dangerous Lua script pattern — full SCAN loop inside a single atomic script (Step 4)
- **What was wrong:** The Lua script used a `repeat...until cursor == "0"` loop to SCAN the entire keyspace and UNLINK all matching keys in a single atomic operation. Since Redis Lua scripts block the server for their entire execution, this would stall Redis for the duration of a full keyspace scan — directly contradicting the runbook's stated goal of non-blocking deletion. This is equivalent to the KEYS anti-pattern the post warns against in Step 1. Additionally, dynamically discovering keys via SCAN inside a script violates Redis's guideline that scripts should only access keys declared as input arguments.
- **What was changed:** Rewrote the Lua script to process a single SCAN iteration per invocation (one batch), returning the cursor to the caller. Added a shell loop that calls the Lua script repeatedly, passing the cursor between invocations with a small sleep between batches. Updated the section title and description to warn against looping SCAN inside a single Lua script.

## Review Notes
- The `--count` hint in `redis-cli --scan --count 100` does not guarantee exactly 100 keys per iteration; Redis may return more or fewer. This is a common and acceptable simplification in tutorials.
- UNLINK was introduced in Redis 4.0. The post does not mention a minimum version requirement, which is fine for a modern runbook but worth noting if targeting legacy environments.
- The `redis-cli --eval` flag is an alternative to `EVAL "$(cat ...)"` for loading Lua scripts from files, with slightly different argument syntax (comma-separated keys and args). Either approach is valid.
