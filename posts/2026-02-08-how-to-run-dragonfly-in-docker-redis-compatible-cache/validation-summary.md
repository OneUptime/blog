# Validation Summary: How to Run Dragonfly in Docker (Redis-Compatible Cache)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dragonfly
- Docker
- Docker Compose
- Redis protocol and Redis CLI tools
- redis-py
- ioredis
- Redis replication
- Dragonfly snapshots and RDB migration

## Sources Consulted
- Dragonfly documentation: https://www.dragonflydb.io/docs
- Dragonfly Docker installation guide: https://www.dragonflydb.io/docs/getting-started/docker
- Dragonfly Docker Compose installation guide: https://www.dragonflydb.io/docs/getting-started/docker-compose
- Dragonfly server configuration flags: https://www.dragonflydb.io/docs/managing-dragonfly/flags
- Dragonfly API compatibility matrix: https://www.dragonflydb.io/docs/command-reference/compatibility
- Dragonfly replication documentation: https://www.dragonflydb.io/docs/managing-dragonfly/replication
- Dragonfly backup and snapshot documentation: https://www.dragonflydb.io/docs/managing-dragonfly/backups
- Dragonfly known limitations: https://www.dragonflydb.io/docs/managing-dragonfly/known-limitations
- Redis benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis Python client examples and command references: https://redis.io/docs/latest/develop/clients/redis-py/
- Docker CLI ulimit reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The standalone cache-mode `docker run` example used `--maxmemory 1gb` without limiting `--proactor_threads`. On multi-core hosts, Dragonfly can fail startup because the memory limit is too low for the default thread count. Added `--proactor_threads 4` to make the example consistent with the 1 GB memory cap.
- The `--maxmemory` explanation called it a hard memory limit. Dragonfly documents it as the maximum memory used by the database, not a Docker/container RSS limit. Changed the wording to "Database memory limit."
- The `--ulimit memlock=-1` explanation asserted a specific memory-locked-pages implementation detail. Reworded it to the verified operational purpose: raising the container locked-memory limit used in Dragonfly's Docker examples.
- The summary claimed every Redis client, command, and tool works unchanged. Dragonfly is Redis-compatible for many APIs, but its official compatibility matrix lists unsupported and partially supported commands. Changed the claim to "Most Redis clients and common commands work unchanged" and directed readers to the compatibility matrix for less common commands.
- The summary described database mode as "for persistent data," which could imply persistence is inherent to the mode. Clarified it as "database mode with snapshots for data-store workloads."

## Review Notes
The Python and Node.js examples use current Redis client patterns and the shown Redis commands are supported by Dragonfly. The Docker image includes `redis-cli`, and live checks against `docker.dragonflydb.io/dragonflydb/dragonfly:latest` confirmed the corrected cache-mode startup pattern and basic Redis-compatible commands.
