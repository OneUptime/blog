# Validation Summary: How to Build a Custom Redis Docker Image

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.2
- Docker (Dockerfile, multi-stage builds, HEALTHCHECK)
- Alpine Linux (base image)
- Redis modules (RedisJSON, RediSearch)
- redis-stack-server Docker image
- OCI image labels

## Sources Consulted
- Docker official documentation for COPY, ENTRYPOINT, CMD, HEALTHCHECK, and multi-stage build behavior (https://docs.docker.com/reference/dockerfile/)
- Redis configuration file documentation for directives: bind, protected-mode, maxmemory, maxmemory-policy, save, appendonly, appendfsync, include, loadmodule (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- Official Redis Docker image on Docker Hub and its Dockerfile for user/group setup (https://hub.docker.com/_/redis)
- redis/redis-stack-server image for module binary paths (https://hub.docker.com/r/redis/redis-stack-server)
- Alpine Linux package index for BusyBox limitations vs shadow utilities (https://pkgs.alpinelinux.org/)
- OCI Image Spec for label conventions (https://github.com/opencontainers/image-spec/blob/main/annotations.md)

## Issues Found

### 1. Basic Dockerfile copies init script but never executes it
**What was wrong:** The Dockerfile copies `docker-entrypoint-init.sh` into the image but uses `CMD ["redis-server", "/etc/redis/redis.conf"]`, which bypasses the init script entirely. The init script (shown in the next section) generates `redis-env.conf` from environment variables and then execs `redis-server`, so it must be the entrypoint for the pattern to work. Additionally, the `redis` user would not have write permission to `/etc/redis/` to create `redis-env.conf`.
**What was changed:** Replaced `CMD ["redis-server", "/etc/redis/redis.conf"]` with `ENTRYPOINT ["/usr/local/bin/docker-entrypoint-init.sh"]` and added `RUN chown redis:redis /etc/redis` so the redis user can write the generated config file.
**Why:** The init script already calls `exec redis-server /etc/redis/redis.conf "$@"`, so using it as the ENTRYPOINT ensures environment variable injection works and Redis starts correctly.

### 2. Modules Dockerfile has a non-functional builder stage
**What was wrong:** The builder stage installs `build-base cmake git python3` and attempts `cargo build --release` to compile RedisJSON from source. However, Rust/cargo is never installed (not in the `apk add` list and not available in Alpine by default), so the build always fails. The `2>/dev/null || true` silently swallows the error. Nothing from the builder stage is used in the final image — modules are copied from `redis-stack-server` instead.
**What was changed:** Removed the entire non-functional builder stage (the `FROM redis:7.2-alpine AS builder` block through the failed cargo build). Kept only the working approach that copies pre-built binaries from `redis/redis-stack-server:latest`.
**Why:** Dead code that silently fails is misleading. Readers copying the Dockerfile would carry a useless stage that adds build time and image layers for no benefit.

### 3. `usermod` not available on Alpine Linux
**What was wrong:** The security hardening section uses `RUN usermod -s /sbin/nologin redis 2>/dev/null || true`. Alpine Linux uses BusyBox, which does not include `usermod`. The command silently fails due to `|| true`, so the security hardening (removing shell access) never actually happens.
**What was changed:** Replaced `usermod` command with `sed -i '/^redis:/s|[^:]*$|/sbin/nologin|' /etc/passwd`, which modifies the shell field in `/etc/passwd` directly — a standard approach on Alpine.
**Why:** The original command was a no-op on Alpine. The `sed` approach works without additional packages and correctly replaces the redis user's login shell.

## Review Notes
- If `requirepass` is configured in the hardened Redis config, the HEALTHCHECK command (`redis-cli ping`) will fail with `NOAUTH Authentication required`. For password-protected instances, the health check would need `redis-cli -a "$REDIS_PASSWORD" ping` or use the `--no-auth-warning` flag. Since the hardened config file content is not shown, this is noted but not fixed.
- The `save 900 1` / `save 300 10` format uses the legacy multi-line syntax. Redis 7.0+ introduced a single-line format (`save 3600 1 300 100 60 10000`), but the multi-line format remains supported for backward compatibility.
- In the official `redis:7.2-alpine` image, the redis user is typically created with `/sbin/nologin` as the default shell already (via `adduser -S`), so the shell-removal step in the Security Hardening section may be redundant. It is still a valid hardening practice to verify explicitly.
