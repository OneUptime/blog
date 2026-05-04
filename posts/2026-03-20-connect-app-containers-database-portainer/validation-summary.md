# Validation Summary: How to Connect Application Containers to Databases in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE)
- Docker Compose (v2 / Compose Specification)
- Docker Networking (bridge networks, embedded DNS)
- PostgreSQL (image `postgres:15`, `pg_isready`)
- MySQL / MariaDB / MongoDB / Redis connection string formats
- Python `psycopg2` driver
- Docker secrets

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose `depends_on` (with `condition: service_healthy`): https://docs.docker.com/compose/compose-file/05-services/#depends_on
- Docker networking and embedded DNS: https://docs.docker.com/network/
- Docker external networks: https://docs.docker.com/compose/compose-file/06-networks/#external
- Docker secrets reference: https://docs.docker.com/engine/swarm/secrets/ and https://docs.docker.com/compose/compose-file/09-secrets/
- PostgreSQL Docker image (env vars, `pg_isready`): https://hub.docker.com/_/postgres
- PostgreSQL connection URI: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
- psycopg2 docs: https://www.psycopg.org/docs/module.html
- MongoDB connection string format: https://www.mongodb.com/docs/manual/reference/connection-string/
- Redis URI scheme (IANA / `redis-cli -u`): https://www.iana.org/assignments/uri-schemes/prov/redis
- MariaDB / MySQL URI compatibility: https://mariadb.com/kb/en/about-mariadb-connector-j/
- Portainer stack environment variables docs: https://docs.portainer.io/user/docker/stacks

## Issues Found
No technical issues found.

All YAML/Compose snippets are syntactically correct and use valid keys (`healthcheck`, `depends_on` with `condition: service_healthy`, `networks.external: true`, `secrets.external: true`). Connection string formats and default ports for PostgreSQL (5432), MySQL (3306), MongoDB (27017), and Redis (6379) are correct, and using the `mysql://` scheme for MariaDB is consistent with how most MySQL-compatible clients handle MariaDB. The psycopg2 retry snippet is valid Python and uses `OperationalError` correctly. The troubleshooting `docker` commands (`docker ps -qf name=...`, `docker exec`, `docker network inspect`, `nslookup`, `nc -zv`) and `docker secret create db_password -` are accurate.

## Review Notes
- The Compose `version: "3.8"` field is still accepted by Docker Compose v2 but is considered obsolete/legacy in the modern Compose Specification — newer versions of `docker compose` print a deprecation warning. The file works as-is, so no fix is required, but future updates could simply drop the `version` line.
- `depends_on` with `condition: service_healthy` is supported by the Docker Compose CLI (v2). It is not honored in Swarm mode (`docker stack deploy`), which is worth keeping in mind when promoting a stack to Swarm.
- `secrets.external: true` requires Docker Swarm mode (`docker secret create` only works on a Swarm manager). The post does not explicitly call this out; readers running a single-node, non-Swarm Portainer environment may want to use the `file:` form of secrets instead. This is a contextual caveat rather than an error.
- `nslookup` and `nc` may not be present in minimal base images (e.g. `alpine`, `distroless`); readers may need to fall back to `getent hosts` or install `busybox-extras` / `netcat-openbsd` in the container.
- For MongoDB, including the database name in the URI also implies it as the authentication database unless `?authSource=admin` (or similar) is supplied — this depends on how the user was created and is out of scope of the post.
