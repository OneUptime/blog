# How to Explain Redis Architecture in an Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Interview, Architecture, Memory, Event Loop

Description: Learn how to clearly explain Redis architecture in an interview - covering the event loop, memory model, persistence, and replication.

---

When an interviewer asks "explain how Redis works under the hood," they want to hear a structured answer that covers the key architectural components. This post gives you a clear framework for answering that question confidently.

## Start with the Core: In-Memory, Single-Threaded

The most important thing to establish first:

> "Redis stores all data in RAM and uses a single-threaded event loop to process commands. This is why it is so fast - no disk I/O for reads and no thread synchronization overhead."

Starting Redis 6.0, I/O threads were added to handle network reads and writes in parallel, but command execution itself remains single-threaded per shard.

## The Event Loop

Redis uses a non-blocking I/O model based on the `epoll` (Linux) or `kqueue` (macOS) system call. The event loop:

```text
1. Accept new client connections
2. Read incoming command data
3. Parse and execute command
4. Write response back to client
5. Handle background tasks (expiration, persistence)
6. Repeat
```

This means Redis can handle thousands of concurrent clients without spawning threads, because operations are short and non-blocking.

## Memory Model

```text
[RAM]
  |- Database 0 (default)
  |    |- key: "user:42" -> Hash { name, email, age }
  |    |- key: "session:abc" -> String (JWT token)
  |    |- key: "leaderboard" -> Sorted Set
  |- Database 1
  |- ...
  |- Database 15
```

Redis uses optimized encoding for small data:
- Short strings use embedded string encoding (no heap allocation)
- Small hashes and sorted sets use `listpack` (formerly `ziplist`) instead of full hash tables

## Persistence Mechanisms

Draw a timeline to explain:

```text
Time:  0s       60s       120s
RDB:   [snap]   [snap]    [snap]    <- point-in-time snapshot
AOF:   [w][w][w][w][w][w][w][w][w] <- every write logged
```

RDB is compact and fast to restore. AOF provides better durability. You can use both together - AOF for durability, RDB for faster restarts.

## Replication Architecture

```text
[Primary]
    |-- replication stream (RESP) -->
[Replica 1]  [Replica 2]

Step 1: Replica connects, requests PSYNC
Step 2: Primary sends RDB snapshot
Step 3: Primary streams all subsequent writes
```

Replicas are read-only and asynchronously replicated. For HA, Redis Sentinel monitors the primary and promotes a replica if it fails.

## How to Structure Your Answer

A good interview answer follows this flow:

1. "Redis is an in-memory data store..." - memory model
2. "It uses a single-threaded event loop..." - concurrency model
3. "For persistence, Redis supports RDB and AOF..." - durability
4. "For high availability, Redis uses Sentinel or Cluster..." - HA
5. "Data structures are memory-optimized..." - encoding

Keep each section to 2-3 sentences unless the interviewer digs deeper.

## Summary

When explaining Redis architecture in an interview, lead with the in-memory, event-loop-based design, then cover persistence options and replication. Show that you understand the trade-offs: speed from RAM, durability risk without persistence, and eventual consistency with replication. A structured, layered answer signals engineering depth.
