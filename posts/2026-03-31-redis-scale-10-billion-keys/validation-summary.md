# Validation Summary: How to Scale Redis for 10 Billion Keys

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Redis (Cluster mode, memory management, data structures)
- redis-cli (cluster creation, keyspace analysis)
- Python redis client (redis-py)
- Redis configuration (listpack encoding thresholds)

## Sources Consulted
- Redis CLUSTER MYID command documentation (https://redis.io/commands/cluster-myid/) — confirmed it returns a single node ID string, not a list of slots
- Redis redis-cli documentation (https://redis.io/docs/latest/develop/tools/cli/) — confirmed --bigkeys and --memkeys use SCAN internally and are standalone modes, not combinable with --scan
- Redis CLUSTER CREATE documentation (https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/) — confirmed --cluster create syntax with --cluster-replicas
- Redis configuration reference (https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/) — confirmed hash-max-listpack-entries and hash-max-listpack-value are the correct config names for Redis 7+
- Redis OBJECT ENCODING documentation (https://redis.io/commands/object-encoding/) — confirmed int encoding for small integers
- Redis MEMORY USAGE documentation (https://redis.io/commands/memory-usage/) — confirmed command syntax
- redis-cli source code (redis-cli.c) — confirmed --bigkeys and --memkeys each call findBigKeys() which exits after completion, making --scan unreachable

## Issues Found

### 1. Incorrect key name byte counts (lines 52-57)
- **What was wrong:** The post claimed "user_profile:username:12345:active" is 45 bytes and "u:12345:a" is 18 bytes. Actual counts are 34 bytes and 9 bytes respectively.
- **What was changed:** Corrected to 34 bytes and 9 bytes.
- **Why:** Simple character counting error. "user_profile:username:12345:active" has 34 characters (= 34 bytes in ASCII), not 45. "u:12345:a" has 9 characters, not 18.

### 2. Incorrect savings calculation (line 59)
- **What was wrong:** The post stated saving 27 bytes per key saves 270 GB. With corrected byte counts, the difference is 25 bytes (34 - 9), yielding 250 GB savings.
- **What was changed:** Updated to "saving 25 bytes per key saves 250 GB."
- **Why:** Follows from the corrected byte counts in issue 1.

### 3. Nonsensical CLUSTER MYID loop (lines 105-108)
- **What was wrong:** The script `for slot in $(redis-cli -p 7001 CLUSTER MYID); do redis-cli -p 7001 DBSIZE; done` uses CLUSTER MYID which returns a single node ID string (a 40-character hex identifier), not a list of slots or nodes. Iterating over it does not monitor key distribution — it just runs DBSIZE once on the same node.
- **What was changed:** Removed the broken for loop and kept only the correct `redis-cli --cluster info` command, which actually reports key counts across all cluster nodes.
- **Why:** CLUSTER MYID returns a single bulk string (the node's own ID). It is not iterable for distribution monitoring.

### 4. Incorrect --scan flag with --bigkeys and --memkeys (lines 118-119)
- **What was wrong:** `redis-cli --bigkeys --scan` and `redis-cli --memkeys --scan` combine two separate modes. Both --bigkeys and --memkeys already use SCAN internally. The --scan flag is a separate standalone mode. When combined, --bigkeys/--memkeys runs first and calls exit(0), so --scan never executes.
- **What was changed:** Removed `--scan` from both commands.
- **Why:** These are independent modes in redis-cli, not composable flags.

## Review Notes
- The hash-max-listpack-entries default in Redis 7+ is 128 (the blog uses 128), but the actual Redis 7.2 default config sets it to 512. The blog's value of 128 is still valid as a configuration choice — it's a tuning parameter, not the default. This is not an error but worth noting.
- The memory estimate of 60-80 bytes per key+value for small strings is a reasonable ballpark but varies with Redis version, allocator (jemalloc vs libc), and key/value sizes. The post correctly frames this as an estimate.
- The post references `OBJ_ENCODING_INT` which is the C source constant name. The OBJECT ENCODING command returns the string "int". Both references are technically correct in context.
