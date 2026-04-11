# Validation Summary: How to Set Up Redis Incident Response Procedures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (server, CLI)
- Redis Sentinel (failover, monitoring)
- Bash scripting (runbook automation)

## Sources Consulted
- Redis SENTINEL commands documentation: https://redis.io/docs/latest/commands/?group=sentinel
- Redis CLI documentation (--scan, --bigkeys, --count options): https://redis.io/docs/latest/develop/tools/cli/
- Redis INFO command documentation (memory section fields): https://redis.io/docs/latest/commands/info/
- Redis CONFIG GET/SET documentation: https://redis.io/docs/latest/commands/config-get/

## Issues Found
1. **Incorrect grep pattern for SENTINEL master output (line 53)**
   - **What was wrong:** The grep pattern `"ip:|flags:|num-slaves:"` used colon-delimited matching (`key:`), but `SENTINEL master mymaster` returns a RESP flat array displayed by redis-cli as numbered pairs (e.g., `3) "ip"` on one line, `4) "10.0.1.10"` on the next). No lines in this output contain `ip:`, `flags:`, or `num-slaves:`, so the grep would silently return no results.
   - **What was changed:** Updated to `grep -A 1 -E "ip|flags|num-slaves"` — removes the colons to match the actual output format and adds `-A 1` to display the following line (the value) alongside each matched field name.
   - **Why:** Without this fix, the grep would produce empty output during an incident, defeating its purpose of quickly surfacing key Sentinel status fields.

## Review Notes
- In Redis 7.0+, many instances of "slave" terminology were replaced with "replica" in commands and output. The `SENTINEL master` output still returns `num-slaves` for backward compatibility as of Redis 7.x, but future versions may change this to `num-replicas`. Users on newer Redis versions should verify the field name.
- The `INFO memory` grep on line 83 correctly uses the `key:value` pattern since `INFO` output uses that format — unlike the SENTINEL array output.
- The `--scan --count 500` usage is valid; `--count` sets the COUNT hint per SCAN iteration (default is 10).
- The sed pattern `'s/:[^:]*$//'` on line 98 assumes the common Redis convention of colon-separated key namespaces. This is a reasonable assumption but should be noted if keys use a different delimiter.
