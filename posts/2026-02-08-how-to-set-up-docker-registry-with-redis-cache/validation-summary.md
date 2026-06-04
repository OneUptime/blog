# Validation Summary: How to Set Up Docker Registry with Redis Cache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Registry / CNCF Distribution
- Docker Compose
- Redis
- Docker CLI
- YAML configuration

## Sources Consulted
- CNCF Distribution v2.8.3 configuration documentation: https://raw.githubusercontent.com/distribution/distribution/v2.8.3/docs/configuration.md
- Current CNCF Distribution configuration documentation: https://distribution.github.io/distribution/about/configuration/
- Docker Compose services reference for `depends_on` and `service_healthy`: https://docs.docker.com/reference/compose-file/services/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- CNCF Distribution HTTP API V2 specification: https://distribution.github.io/distribution/spec/api/
- Local CLI/image checks: `registry:2` reported Docker Distribution 2.8.3; `registry:2` default config path was `/etc/docker/registry/config.yml`; `docker compose exec --help`; `redis:7-alpine redis-cli --help`; `redis:7-alpine redis-server --help`

## Issues Found
- The post described Redis as caching manifests, tags, and general registry storage data. Docker Distribution v2's Redis cache is the blob descriptor cache; official v2.8.3 documentation describes it as caching immutable blob/layer metadata. Updated the introduction, benefits list, and architecture wording to limit the cache behavior to blob descriptor lookups.
- The cache test claimed the timed pull was the second pull, but the example only pulled once after removing the local tag. Added a first pull to warm the descriptor cache, removed the tag again, then timed the second pull.
- The Redis password example did not update the Redis healthcheck. With `--requirepass`, the existing `redis-cli ping` healthcheck would fail. Added a password-aware healthcheck using `REDISCLI_AUTH`.
- The Redis Sentinel environment variables shown for `registry:2` were not supported by the v2 configuration documented for Docker Distribution 2.8.3. Replaced the Sentinel snippet with a registry v2-safe high availability note that points `REGISTRY_REDIS_ADDR` at a stable Redis endpoint.

## Review Notes
- The `registry:2` image and its documented Redis options are still internally consistent for Docker Distribution 2.8.3. Current CNCF Distribution documentation uses newer Redis option names for `registry:3`, so a future upgrade guide should update both the image tag and Redis configuration keys together.
- The Compose `version: "3.8"` field is accepted by Docker Compose, though modern Compose no longer requires a top-level version field.
