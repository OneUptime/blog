# Validation Summary: How to Use Redis with Docker Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7.x
- Docker / Docker Compose
- Docker networking (bridge, overlay)
- Docker Swarm (overlay networks)

## Sources Consulted
- Redis documentation on protected mode: https://redis.io/docs/latest/operate/oss_and_stack/management/security/#protected-mode
- Docker Compose specification (networks, IPAM, internal): https://docs.docker.com/reference/compose-file/
- Docker networking documentation (bridge, overlay, encryption): https://docs.docker.com/engine/network/
- Docker overlay networking with encryption: https://docs.docker.com/engine/network/drivers/overlay/
- Redis Docker image documentation: https://hub.docker.com/_/redis

## Issues Found

### 1. Protected mode misconfiguration in Network Isolation example
- **What was wrong:** The command `redis-server --protected-mode yes` was used without setting a password or explicit `bind` directive. Redis protected mode, when both conditions are met (no explicit bind, no password), rejects all non-loopback connections. Since Docker inter-container communication uses non-loopback addresses, the app container would be unable to connect to Redis.
- **What was changed:** Changed to `redis-server --protected-mode no` with a comment explaining it is safe because the backend network is marked `internal: true`, which provides network-level isolation.
- **Why:** In Docker network-isolated environments, the `internal: true` network property already prevents external access. Protected mode is designed to guard against Redis instances accidentally exposed to the internet, not for Docker-networked Redis behind internal networks. Disabling it while relying on network isolation is the correct approach.

### 2. Incorrect Docker image in network isolation test
- **What was wrong:** `docker run --rm alpine redis-cli -h 172.20.0.10 PING` used the plain `alpine` image, which does not include `redis-cli`. The command would fail with "command not found" rather than demonstrating a network isolation failure (connection refused/timeout).
- **What was changed:** Changed `alpine` to `redis:7-alpine` so the container has `redis-cli` available, and the test properly demonstrates network isolation (the container runs on the default bridge network and cannot reach the custom network's IP).
- **Why:** The test's purpose is to verify network isolation. Using an image without the required tool produces a misleading error that doesn't validate the intended behavior.

## Review Notes
- The `version: "3.8"` field in Docker Compose files is now considered obsolete by Docker Compose V2 and is ignored. It still works but produces a deprecation warning. Future updates to the post could remove it.
- The command `docker compose exec app redis-cli -h redis PING` assumes the app container has `redis-cli` installed, which may not be the case for typical application images. Readers may need to install it or use an alternative connectivity check.
- For production use, the post could benefit from mentioning Redis authentication (`requirepass`) alongside network isolation as defense-in-depth, but the current scope focusing on Docker networking is appropriate.
