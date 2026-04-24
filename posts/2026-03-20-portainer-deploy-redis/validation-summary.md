# Validation Summary: How to Deploy Redis via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Redis 7.2
- Redis Commander

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path volume docs: https://docs.portainer.io/sts/advanced/relative-paths
- Docker Compose top-level `version` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- Docker `configs` / Compose reference: https://docs.docker.com/reference/compose-file/configs/
- Docker `docker exec` CLI docs: https://docs.docker.com/reference/cli/docker/container/exec/
- Redis configuration docs: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis persistence docs: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis security docs: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis CLI docs: https://redis.io/docs/latest/develop/tools/cli/
- Redis rate limiting guidance: https://redis.io/glossary/rate-limiting/
- Redis Commander project docs: https://github.com/joeferner/redis-commander

## Issues Found
- The stack mounted `./redis.conf`, but Portainer's relative path volume support is only available for Git-based deployments in Business Edition. I replaced the external file mount with inline `redis-server` arguments so the stack works as a self-contained Portainer example.
- The post used the old `rediscommander/redis-commander:latest` image and `REDIS_HOSTS` for a password-protected Redis instance. Redis Commander’s current docs use `ghcr.io/joeferner/redis-commander:latest`, and the project notes that `REDIS_HOSTS` only works with passwordless Redis in this scenario. I switched the example to `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, and `REDIS_DB`, and added `user: redis` per the project’s Docker Compose guidance.
- The session-storage example opened `redis-cli` interactively with `docker exec` but omitted `-it`. I added `-it` to match Docker’s documented interactive usage.
- The rate-limiting example reset the counter with `SET ... 0` before every increment, which defeats the limit, and it was not atomic. I replaced it with a `MULTI` / `INCR` / `EXPIRE` / `EXEC` example aligned with Redis guidance.
- The Compose file used the top-level `version` field, which Docker now documents as obsolete. I removed it.
- The conclusion said the healthcheck makes dependent services wait until Redis is ready, but the Compose docs say `depends_on` alone only controls startup order unless `condition: service_healthy` is used. I reworded that sentence to describe the healthcheck accurately.

## Review Notes
- `redis:7.2-alpine` is not the newest Redis line, but the tag and configuration style are still valid for this guide.
- Redis documents `requirepass` as the legacy password-only method and recommends ACL-based authentication for more advanced deployments. The post’s single-password setup is still technically valid for a simple self-hosted guide.
- Exposing port `6379` publicly is risky in production even with authentication enabled. Network restrictions or a private Docker network would be safer for internet-facing environments.
