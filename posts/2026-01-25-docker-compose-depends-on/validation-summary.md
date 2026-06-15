# Validation Summary: How to Use Docker Compose Depends On

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Compose file `depends_on`
- Compose health checks
- Compose profiles
- Docker CLI commands
- PostgreSQL, MySQL, MongoDB, Elasticsearch, RabbitMQ, Kafka, Redis
- Node.js retry logic

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference, including `depends_on`, `healthcheck`, and `profiles`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose profiles reference: https://docs.docker.com/reference/compose-file/profiles/
- Docker Compose `up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose `config` CLI reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Local Docker Compose CLI help output from Docker Compose v5.1.3

## Issues Found
- The Compose examples used the obsolete top-level `version: '3.8'` field. Docker's current Compose Specification treats `version` as only informative and warns that it is obsolete, so I removed the `version` lines from all Compose snippets.
- The profiles example assigned `profiles: default` and `profiles: full` to the core `api` and `database` services while also saying `docker compose up` starts the app without debug tools. Compose only starts profiled services when their profile is active, so I removed profiles from the core services and left only the optional `pgadmin` service under the `debug` profile.
- The restart section said `depends_on` only applies at initial startup and that dependent services do not automatically restart if a dependency restarts. Docker Compose also has a long-syntax `restart: true` dependency option for explicit Compose-managed updates, so I narrowed the claim to runtime restart-policy restarts and default behavior.
- The missing-healthcheck pitfall said the `service_healthy` condition is ignored. Without a health check, the dependency cannot satisfy `service_healthy`, so I corrected the wording.
- The basic startup list said dependencies start "in parallel." Docker documents dependency order, not guaranteed parallel startup, so I removed the parallel claim.

## Review Notes
The post is technically sound after the fixes. The health check commands are reasonable examples, but some depend on tools being present inside the selected images, such as `curl`, `nc`, `mongosh`, `mysqladmin`, or Kafka CLI tools. Future edits could mention that custom application images may need those tools installed for health checks to work.
