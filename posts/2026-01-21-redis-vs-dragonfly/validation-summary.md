# Validation Summary: Redis vs Dragonfly: Modern Redis Alternative Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Redis
- Dragonfly
- Redis CLI
- Dragonfly CLI
- memtier_benchmark
- redis-py
- Lua scripting
- Redis Cluster
- Redis/Dragonfly persistence, replication, ACLs, modules, monitoring

## Sources Consulted
- Redis licensing FAQ: https://redis.io/legal/licenses/
- Redis license change announcement: https://redis.io/blog/redis-adopts-dual-source-available-licensing/
- Redis AGPLv3 announcement: https://redis.io/blog/agplv3/
- Redis latency and threading documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- Redis benchmarking documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- RedisGraph end-of-life announcement: https://redis.io/blog/redisgraph-eol/
- Dragonfly documentation overview: https://www.dragonflydb.io/docs/
- Dragonfly API compatibility matrix: https://www.dragonflydb.io/docs/command-reference/compatibility
- Dragonfly server configuration flags: https://www.dragonflydb.io/docs/managing-dragonfly/flags
- Dragonfly backups documentation: https://www.dragonflydb.io/docs/managing-dragonfly/backups
- Dragonfly AOF documentation: https://www.dragonflydb.io/docs/managing-dragonfly/aof
- Dragonfly cluster mode documentation: https://www.dragonflydb.io/docs/managing-dragonfly/cluster-mode
- Dragonfly ACL documentation: https://www.dragonflydb.io/docs/managing-dragonfly/acl
- Dragonfly monitoring documentation: https://www.dragonflydb.io/docs/managing-dragonfly/monitoring
- Dragonfly HTTP documentation: https://www.dragonflydb.io/docs/managing-dragonfly/using-http
- Dragonfly benchmarking documentation: https://www.dragonflydb.io/docs/getting-started/benchmark
- Dragonfly Docker install documentation: https://www.dragonflydb.io/docs/getting-started/docker
- Dragonfly binary install documentation: https://www.dragonflydb.io/docs/getting-started/binary

## Issues Found
- Redis license was listed only as SSPL. Updated it to RSALv2/SSPLv1/AGPLv3 to reflect Redis 8 licensing.
- Dragonfly persistence was described as having upcoming/in-development AOF. Updated it to state that AOF is not supported, matching current Dragonfly documentation.
- Dragonfly snapshot scheduling was marked as coming soon and used Redis-style `--save` examples. Replaced it with the supported `--snapshot_cron` flag.
- Dragonfly backup examples used `dump.rdb` as the `dbfilename`. Updated examples to `dump`, matching Dragonfly's documented snapshot filename behavior.
- A Dragonfly multiline CLI snippet had an inline comment after a line-continuation backslash, which would not copy-paste correctly in a shell. Moved the comment out of the continued command and used `--proactor_threads=0`.
- The Prometheus metrics example used port `6380`; Dragonfly exposes metrics on the main port `6379` by default unless an admin port is configured. Updated the URL.
- Dragonfly ACL support was described as basic. Updated it to partial, matching Dragonfly's command compatibility matrix.
- Module compatibility examples were stale: RedisGraph is end-of-life in Redis, and Dragonfly has native command-level support for JSON/Search/Bloom-family features rather than broad Redis module parity. Updated the examples accordingly.
- The threaded Python benchmark updated shared counters from multiple threads without synchronization. Added a lock and local per-thread counters so reported operations and errors are not lost to races.

## Review Notes
- Performance, memory, and cost figures are workload-dependent benchmark examples. They are plausible and aligned with Dragonfly's published claims, but readers should still benchmark their own workload before migrating.
