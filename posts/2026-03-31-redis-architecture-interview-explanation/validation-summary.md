# Validation Summary: How to Explain Redis Architecture in an Interview

## Status
validated

## Post Type
Interview Prep / Conceptual Guide

## Technologies Covered
- Redis (architecture, internals)
- epoll / kqueue (I/O multiplexing)
- Redis event loop and threading model (Redis 6.0+ I/O threads)
- Redis persistence (RDB snapshots, AOF)
- Redis replication (PSYNC protocol, RESP)
- Redis Sentinel (high availability)
- Redis memory-optimized encodings (embstr, listpack, ziplist)

## Sources Consulted
- Redis official documentation on persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis official documentation on replication: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis official documentation on Sentinel: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis 6.0 release notes (threaded I/O): https://raw.githubusercontent.com/redis/redis/6.0/00-RELEASENOTES
- Redis source code ae.c event library (epoll/kqueue abstraction)
- Redis documentation on memory optimization and encoding types

## Issues Found
- **Small sets and ziplist claim**: The post stated "Small hashes and sets use `listpack` (formerly `ziplist`)". This is inaccurate for sets — sets never used `ziplist` as their compact encoding. The ziplist-to-listpack transition (in Redis 7.0) applies to hashes and sorted sets. Sets gained `listpack` encoding in Redis 7.2, but their prior compact encoding was `intset` (for integer-only sets), not ziplist. Changed "hashes and sets" to "hashes and sorted sets" to accurately reflect which data structures underwent the ziplist-to-listpack transition.

## Review Notes
- The post uses text diagrams rather than executable code, but makes specific, verifiable technical claims about Redis internals that warranted full review.
- The "per shard" qualifier in "command execution itself remains single-threaded per shard" is slightly unusual for a post that doesn't discuss Redis Cluster in depth, but it is technically correct and covers both standalone and cluster scenarios.
- The event loop description is a reasonable simplification. In practice, background tasks like active key expiration and AOF rewriting involve background threads (bio threads), but the simplified model is appropriate for interview preparation.
- The replication section describes full synchronization (RDB snapshot). Partial resynchronization (using the replication backlog buffer) is also part of PSYNC but is not covered — this is a reasonable omission for the scope of the post.
