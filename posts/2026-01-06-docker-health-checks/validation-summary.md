# Validation Summary: How to Set Up Docker Health Checks That Actually Work

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Dockerfile `HEALTHCHECK`
- Docker Compose health checks and `depends_on`
- Docker Swarm service health behavior
- Node.js and Express health endpoints
- curl, wget, netcat, and shell scripts
- PostgreSQL, MySQL, Redis, MongoDB, Nginx, and RabbitMQ health checks

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker container ls reference: https://docs.docker.com/reference/cli/docker/container/ls/
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/current/app-pg-isready.html
- MySQL `mysqladmin` documentation: https://dev.mysql.com/doc/en/mysqladmin.html
- Redis `PING` command documentation: https://redis.io/docs/latest/commands/ping/
- MongoDB `ping` command documentation: https://www.mongodb.com/docs/manual/reference/command/ping/
- Node.js `AbortSignal.timeout()` documentation: https://nodejs.org/api/globals.html
- MDN `RequestInit` documentation: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit

## Issues Found
- The introduction and description implied Docker, Compose, and Swarm all auto-heal unhealthy containers directly. Updated the wording to clarify that Docker reports health, while recovery requires an orchestrator or external monitor in standalone setups.
- The `node:22-alpine` curl example used `curl` without installing it. Added `RUN apk add --no-cache curl` so the Dockerfile works as shown.
- The JavaScript `fetch` readiness example used a non-standard `timeout` option and a questionable Stripe health URL. Replaced it with `AbortSignal.timeout(5000)` and a configurable external health URL, then checked `response.ok`.
- The restart-policy example comment implied standalone Docker restarts unhealthy containers. Changed the comment to state that standalone Docker does not restart a container just because it is unhealthy.
- The Swarm section referred to replacing containers. Tightened this to service tasks, which is the correct Swarm abstraction.
- The timeout tuning section said timeout must be less than interval. Docker does not require that, so the wording now says it is usually kept less than interval.
- The detection-time comments were too exact. Changed them to approximate detection times.
- The MySQL password expansion was unquoted. Quoted `"$MYSQL_ROOT_PASSWORD"` to handle special characters more safely.
- The `docker ps` monitoring example showed a separate default `HEALTH` column. Docker reports health in `STATUS` by default, and the formatted example now uses the official `.HealthStatus` placeholder.

## Review Notes
- The examples are intentionally minimal. In production, database and broker checks often need host, user, database, TLS, and authentication options specific to the deployment.
- Docker Engine 25.0 and modern Compose support `start_interval`, but the post does not need it for the examples shown.
