# Validation Summary: How to Deploy TimescaleDB via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- TimescaleDB
- PostgreSQL
- Docker Compose
- pgAdmin 4
- Python (`psycopg2`)
- Grafana

## Sources Consulted
- Portainer Docs, Relative Path Support: https://docs.portainer.io/advanced/relative-paths
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- TimescaleDB Docker install docs: https://docs.timescale.com/self-hosted/latest/install/installation-docker/
- TimescaleDB `CREATE TABLE` API: https://docs.timescale.com/api/latest/hypertable/create_table/
- TimescaleDB Hypercore overview: https://docs.timescale.com/api/latest/hypercore/
- TimescaleDB `add_columnstore_policy()`: https://docs.timescale.com/api/latest/hypercore/add_columnstore_policy/
- TimescaleDB `remove_columnstore_policy()`: https://docs.timescale.com/api/latest/hypercore/remove_columnstore_policy/
- TimescaleDB `add_retention_policy()`: https://docs.timescale.com/api/latest/data-retention/add_retention_policy/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Networking in Compose: https://docs.docker.com/compose/how-tos/networking/
- PostgreSQL Docker Official Image docs: https://hub.docker.com/_/postgres/
- pgAdmin container deployment docs: https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html
- Psycopg usage docs: https://www.psycopg.org/docs/usage
- Python `datetime` docs: https://docs.python.org/3/library/datetime.html
- Grafana PostgreSQL query editor docs: https://grafana.com/docs/grafana/latest/datasources/postgres/query-editor/

## Issues Found
- The Compose snippet used the obsolete top-level `version` key. I removed it because current Compose docs mark it as obsolete and informational only.
- The stack mounted `./init.sql` into `/docker-entrypoint-initdb.d`. That relative path does not work for typical Portainer stack deployments and only has special support for Git-based Portainer Business Edition deployments, so I removed the mount and changed the post to run the SQL from pgAdmin after deployment.
- The hypertable example used `create_hypertable()` directly. Current TimescaleDB docs recommend `CREATE TABLE ... WITH (tsdb.hypertable, ...)` for current self-hosted releases, so I updated the initialization SQL accordingly.
- The post used the older compression API (`timescaledb.compress` and `add_compression_policy`). Current TimescaleDB docs have moved this workflow to Hypercore columnstore policies, so I replaced it with `remove_columnstore_policy()` and `add_columnstore_policy()`.
- The retention policy example used the older positional style. I updated it to the current named-argument form and added `if_not_exists => true` so the example is safer to re-run.
- The Python example used `datetime.utcnow()`, which is deprecated and produces a naive datetime. I updated it to `datetime.now(timezone.utc)` and clarified that `host="timescaledb"` only works from a container on the same Docker network.
- The Grafana host guidance implied the service name would always work. I clarified the host value for both same-network container deployments and host-local access.

## Review Notes
- The current `timescale/timescaledb:latest-pg15` tag is valid, but it will drift over time. Pinning an exact image tag would make the tutorial more reproducible in the future.
- Docker and `psql` were not installed in this workspace, so I validated the post against official documentation rather than executing the Compose stack or SQL locally.
