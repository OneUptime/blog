# Validation Summary: How to Use JSON.DEBUG MEMORY in Redis for JSON Memory Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON module
- JSON.DEBUG MEMORY command
- MEMORY USAGE command
- Python redis-py library
- Bash scripting with redis-cli

## Sources Consulted
- Redis official documentation for JSON.DEBUG MEMORY: https://redis.io/docs/latest/commands/json.debug-memory/
- Redis JSON RAM usage documentation: https://redis.io/docs/latest/develop/data-types/json/ram/
- AWS ElastiCache RedisJSON documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/json-debug.html
- redis-py source code for JSON commands (`redis/commands/json/commands.py`)
- redis-py source code for core commands (`redis/commands/core.py`)
- RedisJSON GitHub issue #1131 (default path behavior)

## Issues Found

1. **Incorrect return type description (line 24):** The post stated "Returns an integer (bytes), or an array of integers for wildcard paths." This is inaccurate -- the return type depends on path syntax, not whether the path is a wildcard. Legacy path (`.`) returns a plain integer; JSONPath (`$`) always returns an array, even for non-wildcard paths like `$.name`. Fixed to clarify the distinction is based on path syntax.

2. **Non-existent Python method `debug_memory` (lines 109, 128):** The post used `r.json().debug_memory(key)`, but this method does not exist in redis-py. The correct method is `r.json().debug("MEMORY", key)`, which takes the subcommand as a string argument. Fixed both occurrences.

3. **Invalid import `from redis.commands.core import MEMORY_USAGE` (line 134):** There is no `MEMORY_USAGE` export in `redis.commands.core`. The `memory_usage()` method is available directly on the Redis client instance with no special import needed. Removed the invalid import line.

## Review Notes
- The post states the default path is `$`. The redis.io documentation says the same, but RedisJSON issue #1131 documents that the server actually defaults to the legacy root path `.` (not `$`) for commands with optional path arguments. Since the official docs still say `$`, this was left as-is, but readers should be aware that the actual server behavior returns a plain integer (legacy path behavior) when the path is omitted.
- The exact byte values shown in examples (e.g., 231, 24, 84, 67) are illustrative and will vary depending on RedisJSON version, platform, and allocator. This is acceptable for a tutorial.
- The bash script for finding large JSON keys is functional but note that `redis-cli JSON.DEBUG MEMORY` returns the value prefixed with `(integer) ` in human-readable mode. Using `--no-auth-warning` or `--csv` mode would produce cleaner output for scripting.
