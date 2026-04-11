# Validation Summary: How to Use CONFIG REWRITE in Redis to Save Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (CONFIG REWRITE, CONFIG SET, CONFIG GET commands)
- Python (redis-py client library)
- Node.js (node-redis v4 client library)
- YAML (PyYAML for configuration management)

## Sources Consulted
- Redis official documentation: CONFIG REWRITE - https://redis.io/docs/latest/commands/config-rewrite/
- Redis official documentation: CONFIG RESETSTAT - https://redis.io/docs/latest/commands/config-resetstat/
- Redis official documentation: CONFIG SET - https://redis.io/docs/latest/commands/config-set/
- node-redis GitHub repository and source code - https://github.com/redis/node-redis

## Issues Found

1. **Incorrect CONFIG RESETSTAT reference in comparison table (line 199)**: The table listed "Requires restart or `CONFIG RESETSTAT`" as a con of manual file edits. CONFIG RESETSTAT resets server statistics (keyspace hits/misses, command stats, etc.) reported by INFO — it does NOT reload configuration from a file. Manual file edits require a full Redis restart to take effect. Fixed by removing the CONFIG RESETSTAT reference and clarifying that a restart is required.

2. **Misleading CONFIG RESETSTAT in "Verifying the Rewrite" section (line 208)**: The section included `CONFIG RESETSTAT` with a comment "Not needed, just checking", implying it was related to verifying config changes. CONFIG RESETSTAT has no relation to configuration verification. Replaced with `CONFIG GET maxmemory` which actually verifies the in-memory configuration state.

3. **Node.js example used CommonJS `require` with top-level `await` (lines 88-109)**: The code used `const { createClient } = require('redis')` (CommonJS syntax) but then used top-level `await` which is only valid in ES modules. This code would fail with a SyntaxError in Node.js. Fixed by changing to `import { createClient } from 'redis'` (ES module syntax) which supports top-level await. Also changed `configSet` from the object form (which requires Redis 7.0+) to individual calls for broader compatibility, and fixed `configGet` output access to use `maxmem.maxmemory` since `configGet` returns an object, not a bare value.

## Review Notes
- The `CONFIG SET aclfile /etc/redis/users.acl` example in the "Common Settings to Persist" section may not work at runtime — `aclfile` is likely an immutable/startup-only parameter in most Redis versions. This could not be definitively confirmed from documentation alone, so it was left unchanged.
- The "What CONFIG REWRITE Changes" section states the command "rewrites all CONFIG parameters that differ from default values." Per official docs, the behavior is more nuanced: it applies minimal changes to make the file reflect the current in-memory config, preserving comments and structure, updating existing lines in-place, appending new non-default values, and blanking removed directives. The description is close enough to be acceptable but slightly simplified.
- The Python examples use correct redis-py API calls (`config_set`, `config_rewrite`, `ResponseError`).
- The `maxmemory 2gb` to `2147483648` conversion shown in the basic workflow is correct (2 * 1024^3 = 2,147,483,648).
