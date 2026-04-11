# How Redis Single-Threaded Architecture Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Architecture, Single-Threaded, Performance, Internal

Description: Understand how Redis achieves high throughput with a single-threaded event loop, what operations are truly single-threaded, and where Redis uses multiple threads.

---

## The Single-Threaded Model

Redis processes commands using a single main thread. All command execution, data structure operations, and key expiration run sequentially. This design has several advantages:

- No lock contention between threads (no mutex overhead)
- No race conditions - all operations are atomic by default
- Predictable, low-latency responses
- Simple mental model for developers

Despite being single-threaded for command processing, Redis achieves 100,000+ operations per second on typical hardware through:
- In-memory data structures with O(1) and O(log N) complexity
- Non-blocking I/O via an event loop (epoll/kqueue)
- Efficient memory usage

## The Event Loop Architecture

```text
Event Loop (main thread):

  Accept connections
        |
        v
  Readable event (client sent data)
        |
        v
  Read and parse command from socket buffer
        |
        v
  Execute command against in-memory data
        |
        v
  Write response to output buffer
        |
        v
  Writable event (flush output to socket)
        |
        v
  Back to start (next event)
```

Redis uses the `ae` (async events) library which wraps `epoll` on Linux and `kqueue` on macOS for efficient I/O multiplexing.

## What Is Truly Single-Threaded

These operations run exclusively on the main thread:
- Command parsing and execution
- Data structure read/write operations
- Key expiration (lazy deletion check)
- Pub/Sub message routing
- Lua script execution
- MULTI/EXEC transaction execution

## Where Redis Is Multi-Threaded

Redis is not entirely single-threaded. Background threads handle:

```text
Main thread:         Command execution
BIO thread 1:        Closing file descriptors (e.g., after AOF rewrite)
BIO thread 2:        AOF file sync (fsync calls)
BIO thread 3:        Lazyfree operations (async DEL)
I/O threads:         Network I/O reading/writing (Redis 6.0+, configurable)
```

### Background I/O (BIO) Threads

```bash
# BIO threads for close and fsync exist since Redis 2.4; lazyfree since Redis 4.0
# Thread 1: close() calls for file descriptor cleanup (e.g., after AOF rewrite)
# Thread 2: fsync() for AOF persistence
# Thread 3: Async deletion of large objects (UNLINK)

# Use UNLINK instead of DEL for large keys - runs asynchronously
redis-cli UNLINK large-sorted-set
```

### Threaded I/O (Redis 6.0+)

```bash
# Enable multi-threaded I/O in redis.conf
io-threads 4
io-threads-do-reads yes

# This offloads network read/write to 4 threads
# Command EXECUTION still happens on the main thread
```

## Why Single-Threading Is Fast Enough

```text
Benchmark comparison (typical server):
- Redis single-threaded:  ~100,000-200,000 ops/sec (simple GET/SET)
- Redis with io-threads:  ~500,000+ ops/sec (high-throughput workloads)
- PostgreSQL (disk-based): ~5,000-50,000 queries/sec

Redis speed comes from:
1. All data in RAM (no disk I/O on read path)
2. No lock overhead between threads
3. CPU cache efficiency (sequential data access)
4. Minimal system calls via epoll
```

## Implications for Command Design

Because Redis is single-threaded, slow commands block ALL other clients:

```bash
# DANGEROUS: O(N) commands that block the server
KEYS *              # Scans all keys - blocks for seconds on large DBs
SORT list           # Sorts a large list - O(N+M log M)
SMEMBERS large-set  # Returns all set members
LRANGE list 0 -1    # Returns all list elements

# SAFE alternatives:
SCAN 0 COUNT 100    # Iterates in small batches
SSCAN set 0 COUNT 100
ZSCAN zset 0 COUNT 100
LRANGE list 0 99    # Paginated access
```

## Pipelining for Throughput

Since the event loop processes one command at a time, pipelining batches multiple commands into fewer round trips:

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Without pipelining: N round trips
for (let i = 0; i < 1000; i++) {
  await redis.set(`key:${i}`, `value:${i}`);
}

// With pipelining: 1 round trip
const pipeline = redis.pipeline();
for (let i = 0; i < 1000; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
await pipeline.exec();
// ~10-50x faster in high-latency environments
```

## Checking Thread Count

```bash
# Verify Redis thread count on Linux
ps aux | grep redis-server
cat /proc/$(pgrep redis-server)/status | grep Threads

# Typical output for Redis 6+ with io-threads 4:
# Threads: 7 (main + 3 BIO + 3 additional I/O threads)
```

## Summary

Redis achieves exceptional performance through a single-threaded command execution model combined with non-blocking I/O via the event loop. The main thread processes all commands atomically, eliminating lock overhead, while background BIO threads handle slow I/O operations asynchronously. Since Redis 6.0, optional threaded I/O can offload network reading and writing to multiple threads without changing the single-threaded command execution guarantee.
