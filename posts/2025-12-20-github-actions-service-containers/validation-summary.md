# Validation Summary: How to Use Service Containers in GitHub Actions

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitHub Actions (workflow YAML, `services` key, job containers, matrix strategy)
- Docker (service containers, health checks via `--health-cmd`/`--health-interval`/etc., volumes, registry credentials)
- PostgreSQL (`postgres:15`, `pg_isready`, `psql`, `docker-entrypoint-initdb.d`)
- Redis (`redis:7-alpine`, `redis-cli ping`)
- Elasticsearch (`elasticsearch:8.11.0`, single-node discovery, `xpack.security.enabled`)
- MongoDB (`mongo:7`, `mongosh`)
- MySQL (`mysql:8`, `mysqladmin ping`)
- RabbitMQ (`rabbitmq:3-management`, `rabbitmq-diagnostics`)
- GitHub Container Registry (ghcr.io), `actions/checkout@v4`, `actions/setup-node@v4`

## Sources Consulted
- GitHub Actions — About service containers: https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- GitHub Actions — Creating PostgreSQL/Redis service containers (docs.github.com/en/actions/using-containerized-services)
- Official Docker images and their documented env vars / entrypoint hooks: postgres, mysql, mongo, redis, rabbitmq, elasticsearch (Docker Hub / Elastic docs)
- Docker `--health-cmd` and HEALTHCHECK reference

## Issues Found
No technical issues found.

## Review Notes
- Networking guidance is accurate and matches official docs: when the job runs directly on the runner, services are reached via mapped `localhost:<port>` ports; when the job runs in a job container, services share a user-defined Docker bridge network and are reached by service name (no `ports` mapping required). Both cases are demonstrated correctly.
- Health check commands are correct for each image's available tooling: `pg_isready` (postgres), `redis-cli ping` (redis), `mongosh` (mongo:7 — `mongosh` replaced the legacy `mongo` shell, so it is correct for v7), `mysqladmin ping` (mysql:8), `rabbitmq-diagnostics -q ping` (rabbitmq), and `curl` (present in the official Elasticsearch images).
- Environment variable names are correct for each image: `POSTGRES_*`, `MYSQL_*`, `MONGO_INITDB_ROOT_*`, `RABBITMQ_DEFAULT_*`, and Elasticsearch's dotted keys (`discovery.type`, `xpack.security.enabled`) passed as env entries.
- The `docker-entrypoint-initdb.d` initialization pattern is correctly applied to PostgreSQL; scripts run only on first init of an empty data directory, which is the intended behavior for ephemeral CI containers.
- `credentials` with `${{ github.actor }}` / `${{ secrets.GITHUB_TOKEN }}` for pulling private ghcr.io images is valid.
- Minor future caveat (not an error): image tags like `postgres:15`, `mongo:7`, `mysql:8`, and `elasticsearch:8.11.0` are version-pinned and will age over time; readers may wish to bump to newer majors as they become current. This does not affect correctness of the examples.
