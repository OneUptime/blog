# Validation Summary: How to Tune Redis for 100K+ Operations Per Second

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Redis 6+ (multi-threaded I/O, persistence configuration, Unix sockets)
- redis-py (Python Redis client: pipelining, connection pools, keepalive options)
- Linux kernel tuning (sysctl, transparent hugepages)
- redis-benchmark CLI tool

## Sources Consulted
- Redis official documentation on threaded I/O: https://redis.io/docs/management/config/#threaded-io
- Redis official documentation on redis-benchmark: https://redis.io/docs/management/optimization/benchmarks/
- redis-py source code (`client.py`, `connection.py`) for `socket_keepalive_options` type hints and `setsockopt` usage
- Redis official documentation on persistence (RDB/AOF): https://redis.io/docs/management/persistence/
- Redis official documentation on latency and optimization: https://redis.io/docs/management/optimization/latency/

## Issues Found

### 1. `socket_keepalive_options` used string keys instead of socket constants
- **What was wrong:** The connection pool example used string keys like `"TCP_KEEPIDLE"` for `socket_keepalive_options`. redis-py's type signature is `Mapping[int, Union[int, bytes]]` — keys must be integer constants from Python's `socket` module. String keys would cause a `TypeError` at runtime when passed to `sock.setsockopt()`.
- **What was changed:** Replaced `"TCP_KEEPIDLE"`, `"TCP_KEEPINTVL"`, and `"TCP_KEEPCNT"` with `socket.TCP_KEEPIDLE`, `socket.TCP_KEEPINTVL`, and `socket.TCP_KEEPCNT`, and added `import socket`.

### 2. `io-threads-do-reads yes` recommendation removed
- **What was wrong:** The post recommended enabling `io-threads-do-reads yes`. The official Redis documentation states that threading reads "doesn't help much" and recommends leaving this at the default (`no`).
- **What was changed:** Removed the `io-threads-do-reads yes` line from the configuration snippet.

### 3. Incorrect `io-threads` sizing guidance
- **What was wrong:** The post recommended setting `io-threads` to "the number of physical CPU cores minus 1". The official Redis documentation recommends 2-3 threads for a 4-core machine, up to 6 for an 8-core machine, and advises never exceeding 8 threads.
- **What was changed:** Replaced the "cores minus 1" rule with guidance matching the official Redis documentation.

## Review Notes
- The `socket.TCP_KEEPIDLE` and `socket.TCP_KEEPCNT` constants are Linux-specific and not available on macOS or Windows. The post targets Linux (kernel tuning section), so this is acceptable, but readers on other platforms should be aware.
- The benchmark numbers (95K baseline, 600K+ with pipelining) are realistic for modern hardware but will vary significantly depending on payload size, hardware, and network conditions.
- The persistence section correctly distinguishes between fully disabling persistence and a compromise configuration with `appendfsync everysec`.
