# Validation Summary: How to Use Redis in Clojure with Carmine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Clojure
- Carmine (taoensso/carmine) — Redis client for Clojure
- Nippy — Clojure serialization library used by Carmine
- JVM

## Sources Consulted
- Carmine GitHub repository: https://github.com/taoensso/carmine
- Carmine releases / changelog: https://github.com/taoensso/carmine/releases
- Clojars version listing: https://clojars.org/com.taoensso/carmine/versions
- Carmine Getting Started wiki: https://github.com/taoensso/carmine/wiki/1-Getting-started
- Carmine Message Queue wiki: https://github.com/taoensso/carmine/wiki/3-Message-queue
- Carmine API docs (cljdoc): https://cljdoc.org/d/com.taoensso/carmine
- Carmine source code (connections.clj, carmine.clj, message_queue.clj)
- Redis command reference: https://redis.io/commands

## Issues Found
- **Outdated Carmine version**: The post specified version `3.3.2` (released 2023-10-24). Updated to `3.5.0` (released 2025-11-06), which is the latest stable release. All code examples in the post remain compatible with v3.5.0.

## Review Notes
- The `HMSET` Redis command used in the Hash example is deprecated as of Redis 4.0.0 in favor of `HSET` (which now accepts multiple field-value pairs). The code still works correctly, but new code should prefer `car/hset` with multiple field-value pairs.
- The `SETEX` command is similarly deprecated as of Redis 6.2.0 in favor of `SET` with the `EX` option. Again, it still works but is not the modern approach.
- Carmine v3.5.0 introduced a logging change from Timbre to Trove. This does not affect any of the code examples in this post since none involve logging configuration.
- All API usage (wcar macro, connection spec, pipelining, Pub/Sub with `with-new-pubsub-listener`/`close-listener`, message queue with `mq/enqueue`/`mq/worker`/`mq/stop`, Nippy serialization) was verified against the official source code and documentation and is correct.
