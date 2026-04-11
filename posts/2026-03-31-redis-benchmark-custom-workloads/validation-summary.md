# Validation Summary: How to Benchmark Redis with Custom Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-benchmark CLI tool)
- Python (redis-py client library)
- Redis Cluster

## Sources Consulted
- Official Redis benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- redis-benchmark CLI help output and option reference
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Non-existent `--cmd` flag in redis-benchmark
**What was wrong:** The post used `--cmd "COMMAND args..."` to specify custom commands for redis-benchmark. This flag does not exist. The correct way to benchmark arbitrary commands is to pass the command and its arguments as trailing positional arguments after the options.

**What was changed:** Replaced `--cmd "HSET user:__rand_int__ ..."` syntax with `HSET user:__rand_int__ ...` (command passed directly as trailing arguments). Updated the introductory text from "Use `--cmd` to test any command" to "Pass the command and its arguments directly after the options". Updated the summary paragraph to remove the `--cmd` reference.

**Why:** `--cmd` is not a documented redis-benchmark option. Custom commands are passed as positional arguments at the end of the command line, per the official Redis documentation.

### 2. Missing `-r` flag for `__rand_int__` substitution
**What was wrong:** The custom command examples used `__rand_int__` as a placeholder but did not include the `-r` flag. Without `-r <keyspacelen>`, redis-benchmark does not perform `__rand_int__` substitution — the literal string `__rand_int__` would be used as the key/value.

**What was changed:** Added `-r 100000` to each of the three custom command benchmark examples.

**Why:** The `-r` flag is required to enable `__rand_int__` substitution. Per the official docs: "Using this option the benchmark will expand the string `__rand_int__` inside an argument with a 12 digits number in the specified range from 0 to keyspacelen-1."

## Review Notes
- The Python benchmark script is correct and functional. It uses redis-py pipelines, threading, and `time.perf_counter()` appropriately. Using list comprehensions for `t.start()` and `t.join()` is a minor style concern but not a technical error.
- The `--cluster` flag for redis-benchmark is valid (added in Redis 6.0.0).
- The read/write ratio simulation using parallel background processes is a rough approximation — in practice the two benchmark instances don't coordinate key access, so GETs may hit nonexistent keys. This is a known limitation of this approach but the post does not make incorrect claims about it.
- The `-r` explanation and key space testing section are accurate.
