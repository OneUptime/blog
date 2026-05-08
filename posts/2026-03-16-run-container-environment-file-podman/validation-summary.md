# Validation Summary: How to Run a Container with an Environment File in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container environment variables
- Environment files
- PostgreSQL container image
- Redis container image
- MySQL container image
- Bash
- Git

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Podman `--env-file` option documentation: https://docs.podman.io/en/v4.6.0/markdown/options/env-file.html
- Podman environment file parser source: https://raw.githubusercontent.com/containers/podman/main/pkg/env/env.go
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres/
- MySQL Docker Official Image documentation: https://hub.docker.com/_/mysql
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis
- Redis Docker deployment tutorial: https://redis.io/tutorials/operate/orchestration/docker/

## Issues Found
- The environment file format section said quotes are optional but supported. Podman's env-file parser treats everything after `=` as the literal value, so quote characters are preserved rather than used for shell-style grouping. Updated the text and variable names to make that behavior clear.
- The Redis example used `REDIS_MAXMEMORY` and `REDIS_MAXMEMORY_POLICY`, which are not the documented mechanism for passing those Redis server options to the official Redis image. Updated the example to use `REDIS_ARGS=--maxmemory 256mb --maxmemory-policy allkeys-lru`, matching Redis container documentation.

## Review Notes
- Podman documents `--env-file` as a current option for `podman run`, and its environment precedence confirms that later env files override earlier env files and `--env`/`-e` overrides env-file values.
- PostgreSQL and MySQL examples use documented initialization environment variables for their official images.
- Environment variables are convenient for configuration, but secrets passed this way can still be visible through container inspection or process environments to sufficiently privileged users. Podman secrets may be preferable for sensitive production values.
