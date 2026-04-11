# Validation Summary: How to Migrate from Redis to DragonflyDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Redis (in-memory data store)
- DragonflyDB (Redis-compatible in-memory database)
- Docker (container runtime)
- Python redis-py client library
- redis-cli (Redis command-line interface)
- redis-benchmark (Redis benchmarking tool)

## Sources Consulted
- Redis COMMAND documentation: https://redis.io/docs/latest/commands/command/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis BGSAVE, LASTSAVE, CONFIG GET documentation: https://redis.io/docs/latest/commands/
- Redis REPLICAOF documentation: https://redis.io/docs/latest/commands/replicaof/
- DragonflyDB documentation: https://www.dragonflydb.io/docs
- DragonflyDB Docker image registry: https://www.dragonflydb.io/docs/getting-started
- DragonflyDB replication docs: https://www.dragonflydb.io/docs/managing-dragonfly/replication
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- redis-benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/

## Issues Found
1. **Invalid Redis command `COMMAND STATS`**: The post used `redis-cli COMMAND STATS` to check command usage statistics. `COMMAND STATS` is not a valid Redis command or subcommand. The correct command is `redis-cli INFO commandstats`, which returns per-command call counts, total CPU time, and average CPU time. The sort pipeline was also adjusted from `sort -t: -k2 -rn` to `sort -t= -k2 -rn` to correctly parse the `INFO commandstats` output format (e.g., `cmdstat_get:calls=1000,usec=2000,usec_per_call=2.00`), where sorting by the second field after splitting on `=` extracts the call count numerically.

## Review Notes
- The post notes "No native RedisJSON/RediSearch (as of early 2025)." DragonflyDB has since added partial JSON support. The caveat date makes this acceptable but readers should check current DragonflyDB docs for the latest module support status.
- All Redis CLI commands (BGSAVE, LASTSAVE, CONFIG GET, REPLICAOF, DBSIZE, INFO) are correct and current.
- The Docker image path `docker.dragonflydb.io/dragonflydb/dragonfly` and the flags `--logtostdout` and `--requirepass` are correct for DragonflyDB.
- The Python redis-py code is syntactically correct and uses current, non-deprecated APIs (including `hset` with `mapping` parameter).
- The redis-benchmark flags (`-h`, `-p`, `-n`, `-c`, `-t`) are all valid.
- The claim about DragonflyDB's thread-per-core / shared-nothing architecture is accurate.
- The replication workflow (REPLICAOF to sync, REPLICAOF NO ONE to promote) is the correct procedure for live migration.
