# Validation Summary: How to Run Redis in Docker and Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Docker
- Docker Compose
- Redis persistence with AOF and RDB
- Redis replication
- Redis Sentinel
- Python, Flask, redis-py, and Gunicorn
- Node.js, Express, and ioredis
- Go and go-redis

## Sources Consulted
- Redis Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- redis-cli help from the official `redis:7-alpine` image
- redis-server and redis-sentinel help/version output from the official `redis:7-alpine` image
- redis-py connection documentation: https://redis.readthedocs.io/en/stable/connections.html
- redis-py production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- ioredis documentation: https://github.com/redis/ioredis
- go-redis documentation: https://redis.io/docs/latest/develop/clients/go/
- go-redis package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Gunicorn documentation: https://gunicorn.org/

## Issues Found
- Removed obsolete `version: '3.8'` keys from the Docker Compose snippets. Current Docker Compose treats the top-level `version` property as obsolete and emits a warning when it is used.
- Fixed the production Redis password handling. The Compose file referenced `.env`, but `redis.conf` had a hardcoded `requirepass`, and the healthcheck used exec-form `CMD` with an escaped environment variable that would not be expanded by a shell. The Redis server command now supplies `--requirepass "$${REDIS_PASSWORD}"`, and the healthcheck uses `CMD-SHELL` so the container environment variable is expanded.
- Replaced `npm install --production` with `npm install --omit=dev`, which is the current npm form for omitting development dependencies.
- Removed `sentinelPassword` from the ioredis and go-redis Sentinel client examples. The Sentinel Compose setup configures `sentinel auth-pass` for Sentinel-to-Redis authentication, but it does not configure Sentinel itself to require client authentication.
- Fixed the Go snippet by removing an unused `context` import and `ctx` variable, which would prevent the example from compiling.

## Review Notes
- The post uses `redis:7-alpine`; the official image currently resolves to Redis 7.4.x, and the documented Redis server, CLI, and Sentinel commands are available in that image.
- The current `github.com/redis/go-redis/v9` release requires Go 1.24 or newer. The snippet compiles with Go 1.24, but future readers using older Go toolchains may need to pin an older go-redis release or upgrade Go.
- Some commands pass Redis passwords on the command line with `redis-cli -a`, which is common in short examples but causes Redis CLI to warn that command-line passwords may be visible to other users. For production scripts, `REDISCLI_AUTH` or another secret-handling approach would be preferable.
