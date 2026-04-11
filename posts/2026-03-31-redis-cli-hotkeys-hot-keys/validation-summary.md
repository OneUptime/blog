# Validation Summary: How to Use Redis CLI --hotkeys for Finding Hot Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-cli `--hotkeys` flag, LFU eviction policy, `OBJECT FREQ` command)
- Redis CLI commands and configuration
- Python (redis-py client library examples for local caching and key sharding)
- Redis Cluster (`READONLY` command for read replicas)

## Sources Consulted
- Redis official documentation for `redis-cli --hotkeys` mode: https://redis.io/docs/latest/develop/tools/cli/
- Redis official documentation for `OBJECT FREQ` command: https://redis.io/docs/latest/commands/object-freq/
- Redis official documentation for LFU eviction and `maxmemory-policy`: https://redis.io/docs/latest/develop/reference/eviction/
- Redis source code for LFU implementation (24-bit LRU field: 16 bits last decrement time + 8 bits logarithmic counter)
- Redis official documentation for `READONLY` command: https://redis.io/docs/latest/commands/readonly/

## Issues Found

### 1. LFU counter values exceed maximum possible value
- **What was wrong:** The `--hotkeys` output example showed counter values of 1024, 892, and 450. The `OBJECT FREQ` example also showed 1024. Redis LFU uses an 8-bit logarithmic counter (stored in the lower 8 bits of the 24-bit LRU field), so the maximum possible value is 255. Values above 255 are impossible.
- **What was changed:** Replaced counter values with realistic values within the valid 0-255 range: 255, 198, and 142 in the `--hotkeys` output, and 255 in the `OBJECT FREQ` example.
- **Why:** Showing impossible counter values could confuse readers and misrepresent how the LFU frequency tracking works.

### 2. Error message had double error prefix
- **What was wrong:** The error message shown when LFU is not enabled was `ERR: ERR object freq is not allowed...` which has a redundant double prefix.
- **What was changed:** Changed `ERR: ERR` to `Error: ERR` to match the format redis-cli uses when displaying server error responses.
- **Why:** The `ERR:` prefix is not how redis-cli formats error output; the server returns `ERR ...` and redis-cli may prefix it with `Error:` but not `ERR:`.

## Review Notes
- The post correctly notes that `--hotkeys` requires an LFU eviction policy. Both `allkeys-lfu` and `volatile-lfu` work, though the post only demonstrates `allkeys-lfu`. This is acceptable since `allkeys-lfu` is the more common choice.
- The explanation of the LFU counter as a "logarithmic counter that decays over time" is accurate. Redis uses a Morris counter with configurable decay via the `lfu-decay-time` and `lfu-log-factor` settings, which the post does not cover but are not essential for the tutorial scope.
- The Python code examples for local caching and key sharding are syntactically correct and functionally sound.
- The `READONLY` command example is correct for Redis Cluster read replica routing.
- The `-i` flag for rate limiting during scan is correctly documented.
