# Validation Summary: How to Use SCRIPT FLUSH in Redis to Clear Script Cache

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (core server, script cache subsystem)
- Redis SCRIPT FLUSH, SCRIPT LOAD, SCRIPT EXISTS, EVALSHA commands
- Lua scripting in Redis
- Redis Cluster (script cache behavior per node)
- redis-cli (command-line interface)

## Sources Consulted
- Official Redis SCRIPT FLUSH documentation: https://redis.io/docs/latest/commands/script-flush/
- Official Redis EVALSHA documentation: https://redis.io/docs/latest/commands/evalsha/
- Official Redis SCRIPT LOAD documentation: https://redis.io/docs/latest/commands/script-load/
- SHA1 hash verification via independent computation of `return 'test'`

## Issues Found

1. **Incorrect SHA1 hash for `return 'test'`** (line 60, 64, 74): The post listed the SHA1 hash as `2067d915024a3e1657c4169c84f809f8ec75b9a7`, but the actual SHA1 of the string `return 'test'` is `4eaa03de2a8a71a0758a6ffb7ab8f8fa2788517f`. Fixed all three occurrences (the SCRIPT LOAD output and both SCRIPT EXISTS commands).

2. **Incorrect terminology: "keyspace" instead of "script cache"** (line 17, line 25 in Mermaid diagram): The post described ASYNC mode as removing scripts "from the keyspace." In Redis, "keyspace" refers to the database key space (actual data keys), not the script cache. Scripts are stored in a separate server-side script cache. Changed to "script cache" in both the text description and the Mermaid diagram.

3. **Misleading description of SYNC default behavior** (line 16): The post stated SYNC is "default in Redis 6.2 and earlier." Before Redis 6.2, the ASYNC/SYNC options did not exist at all — the command simply flushed synchronously with no mode parameter. In Redis 6.2+, the default is SYNC unless the `lazyfree-lazy-user-flush` configuration is set to `yes`, in which case the default becomes ASYNC. Updated the description to accurately reflect this behavior.

## Review Notes
- The placeholder `some-sha1-hash` used in the "EVALSHA after SCRIPT FLUSH" example (line 111) is intentionally not a real hash to illustrate the concept. This is acceptable for a demonstrative example.
- The post correctly notes that Redis Cluster requires per-node script flushing/reloading, which is an important operational detail.
- The NOSCRIPT error recovery pattern described (catch error, reload with EVAL/SCRIPT LOAD, retry) is the standard recommended approach.
- Prior to Redis 6.2, SCRIPT FLUSH had no ASYNC/SYNC options. The post could mention this for completeness, but since Redis 6.2 is now well-established, the current framing is acceptable.
