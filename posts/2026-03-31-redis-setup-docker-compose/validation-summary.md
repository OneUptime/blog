# Validation Summary: How to Set Up Redis with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.2
- Docker / Docker Compose
- Alpine Linux (base image)

## Sources Consulted
- Official Redis Docker image documentation: https://hub.docker.com/_/redis
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_bsp/operate/server/config/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_bsp/operate/persistence/
- Redis security / AUTH documentation: https://redis.io/docs/latest/operate/oss_and_bsp/operate/security/
- Docker Compose specification: https://docs.docker.com/reference/compose-file/
- Redis URI scheme: https://www.iana.org/assignments/uri-schemes/prov/redis

## Issues Found

1. **REDIS_URL missing authentication credentials (Full Stack example):** The environment variable `REDIS_URL=redis://redis:6379` was set on the app service, but the Redis service requires authentication via `--requirepass`. Most Redis client libraries parse credentials from the URL, so the app would fail to connect. Fixed to `REDIS_URL=redis://:your_strong_password@redis:6379`.

2. **Misleading `REDIS_PASSWORD` environment variable (Authentication example):** The `REDIS_PASSWORD` environment variable was set on the `redis` service container. The official `redis:7.2-alpine` image does not read this variable — it is not a supported configuration mechanism for the official image (unlike Bitnami's Redis image which does use it). The password was already correctly configured via the `--requirepass` flag in the command. Removed the misleading environment block to avoid confusion.

## Review Notes
- The `version: "3.9"` field in docker-compose.yml is deprecated in Docker Compose V2 and produces a warning. It is ignored and does not affect functionality. It is still widely used in tutorials, so this is not a breaking issue, but future readers should be aware they can omit it.
- The healthcheck command uses `redis-cli -a <password>`, which prints a stderr warning ("Using a password with '-a' ... may not be safe"). This does not affect the healthcheck since Docker checks the exit code, not stderr. An alternative is to use `redis-cli --no-auth-warning -a <password> PING` to suppress the warning in logs.
- The `redis.conf` example sets `protected-mode no` alongside `requirepass`, which is acceptable since authentication is enabled. Without `requirepass`, disabling protected mode would be a security risk.
