# Validation Summary: How to Debug Redis in Docker Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (redis-cli, SLOWLOG, MONITOR, MEMORY DOCTOR, BGSAVE, INFO)
- Docker (docker exec, docker logs, docker inspect, docker stats, docker compose)
- Linux networking tools (netstat, ss, nc, nslookup)

## Sources Consulted
- Redis CLI official documentation: https://redis.io/docs/latest/develop/tools/cli/
- Docker CLI reference for `docker exec`: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI reference for `docker logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference for `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference for `docker stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis SLOWLOG documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis MEMORY DOCTOR documentation: https://redis.io/docs/latest/commands/memory-doctor/
- Verified redis-cli flags via `redis-cli --help` output from redis:latest Docker image

## Issues Found

1. **Incorrect `--latency` flag usage (line 94)**: The command `redis-cli --latency -c 100` was incorrect. The `-c` flag in redis-cli enables cluster mode (a boolean flag) and does not accept a numeric argument to limit sample count. The `--latency` mode runs continuously and has no built-in sample count limiter. Fixed by wrapping with `timeout 5` (consistent with the MONITOR command pattern used earlier in the post) and removing the invalid `-c 100`.

2. **Incorrect `-i` flag syntax (line 100)**: The command `redis-cli --bigkeys --i 0.1` used a double-dash `--i` which is not a valid redis-cli flag. The correct flag is single-dash `-i` (short option for scan interval). Fixed to `redis-cli --bigkeys -i 0.1`.

## Review Notes
- The `apk add redis` command in the Alpine debug container section installs the full Redis package to get redis-cli. A lighter alternative would be to use the `redis:alpine` image directly, but the current approach works.
- The `docker logs redis --since 1h` syntax is correct for Docker, though some older Docker versions may require the full format `--since 1h0m0s`.
- All Docker inspect Go template syntax is correct.
- The MEMORY DOCTOR command requires Redis 4.0+; this is not noted but is unlikely to be an issue with current Docker images.
