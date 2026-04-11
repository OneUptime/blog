# Validation Summary: How to Configure Redis in Docker with Custom redis.conf

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7
- Docker / Docker Compose
- Docker Swarm
- Alpine Linux (apk package manager)
- GNU gettext (`envsubst`)

## Sources Consulted
- Official Redis Docker image documentation (https://hub.docker.com/_/redis)
- Redis configuration documentation (https://redis.io/docs/latest/operate/oss_and_bsp/install/install-redis/)
- GNU gettext `envsubst` documentation
- Docker Compose specification for `configs` and `volumes`
- Redis server command-line options (`redis-server --help`)
- Redis CONFIG GET command documentation

## Issues Found

### 1. `envsubst` does not support `${VAR:-default}` syntax
**What was wrong:** The `redis.conf.template` used Bash-style default value syntax (e.g., `${REDIS_MAXMEMORY:-2gb}`) inside the template file processed by `envsubst`. GNU `envsubst` only recognizes `$VAR` and `${VAR}` forms — it does not support parameter expansion features like `:-`. With unset variables, the entire `${VAR:-default}` expression passes through as literal text, producing invalid Redis configuration.

**What was changed:** Moved the default value logic into the entrypoint shell script using standard shell parameter expansion (`export REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-2gb}"`), and simplified the template to use plain `${VAR}` references that `envsubst` correctly handles.

### 2. Shebang not on first line of entrypoint script
**What was wrong:** The entrypoint script code block had `# redis-entrypoint.sh` as the first line and the shebang `#!/bin/sh` on the second line. If copied verbatim, the shebang would not be on the first line of the file, potentially causing the script to fail or be interpreted by the wrong shell.

**What was changed:** Moved the shebang `#!/bin/sh` to the first line and the filename comment to the second line.

## Review Notes
- The `version: "3.8"` key in docker-compose files is deprecated in Docker Compose V2 (the `docker compose` plugin) and is silently ignored. It still works but is unnecessary. This is not incorrect for the post's context but may warrant a note in a future update.
- The `protected-mode no` combined with `bind 0.0.0.0` in Method 1 disables Redis security protections. This is common in Docker/dev environments but readers should be aware of the security implications for production use.
- All Redis configuration directives, CLI flags, and `CONFIG GET` commands are correct for Redis 7.
- The Docker Swarm `configs` syntax is correct for Compose v3.8.
- The claim that CLI arguments override config file values is correct.
