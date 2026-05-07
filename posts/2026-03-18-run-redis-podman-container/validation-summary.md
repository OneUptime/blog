# Validation Summary: How to Run Redis in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Redis
- Redis CLI
- Redis container image
- Redis persistence with AOF and RDB snapshots
- Redis configuration

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman pull` documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Docker Official Redis image documentation: https://hub.docker.com/_/redis
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis AUTH command documentation: https://redis.io/docs/latest/commands/auth/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/

## Issues Found
- The pull command used the `docker.io/library/redis:7` image, but the `podman run` examples used the short image name `redis:7`. Podman can prompt for or reject unresolved short-name references depending on registry configuration, so the examples now consistently use `docker.io/library/redis:7`.
- The pull section described `redis:7` as the "latest Redis image". Redis 8 is now available, and `redis:7` means the Redis 7 major-version tag rather than the latest Redis release line. The wording now says "Pull the Redis 7 image."

## Review Notes
- The Redis configuration directives shown, including `requirepass`, `appendonly`, `appendfsync`, `save`, `maxmemory`, and `maxmemory-policy allkeys-lru`, are valid Redis configuration settings.
- The `redis-cli -a` authentication examples are valid, but Redis documentation recommends `REDISCLI_AUTH` or another less exposed method for passwords in production scripts.
- The `:Z` volume suffix is valid for SELinux relabeling in Podman. It is useful on SELinux-enabled systems but may be unnecessary on systems without SELinux enforcement.
