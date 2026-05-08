# Validation Summary: How to Deploy CockroachDB via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- CockroachDB v25.2.18
- Docker Compose / Portainer stacks
- CockroachDB SQL CLI
- CockroachDB multi-region SQL
- CockroachDB geospatial SQL
- Python psycopg2 PostgreSQL-compatible client connections
- TLS certificate generation for CockroachDB
- Prometheus-compatible CockroachDB metrics endpoints

## Sources Consulted
- CockroachDB v25.2 release notes and Docker image availability: https://www.cockroachlabs.com/docs/releases/v25.2
- CockroachDB `cockroach start` command reference: https://www.cockroachlabs.com/docs/stable/cockroach-start
- CockroachDB `cockroach init` command reference: https://www.cockroachlabs.com/docs/stable/cockroach-init
- CockroachDB local Docker cluster guide: https://www.cockroachlabs.com/docs/stable/start-a-local-cluster-in-docker-mac
- CockroachDB `CREATE USER` reference: https://www.cockroachlabs.com/docs/stable/create-user
- CockroachDB authentication reference: https://www.cockroachlabs.com/docs/stable/authentication
- CockroachDB `ALTER DATABASE` multi-region reference: https://www.cockroachlabs.com/docs/stable/alter-database
- CockroachDB table locality reference: https://www.cockroachlabs.com/docs/stable/table-localities
- CockroachDB `ALTER TABLE ... SET LOCALITY` reference: https://www.cockroachlabs.com/docs/stable/alter-table
- CockroachDB spatial query and function references: https://www.cockroachlabs.com/docs/stable/query-spatial-data and https://www.cockroachlabs.com/docs/stable/functions-and-operators
- CockroachDB health, node status, and monitoring references: https://www.cockroachlabs.com/docs/stable/monitoring-and-alerting and https://www.cockroachlabs.com/docs/stable/prometheus-endpoint
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- The post created `appuser` with `WITH PASSWORD` while the Docker stack starts every CockroachDB node with `--insecure`. CockroachDB documents that password creation is supported only in secure clusters. I changed the example to `CREATE USER appuser;` and removed the password from the insecure Python connection example.
- The Python example imported `urlparse` but did not use it. I removed the unused import so the snippet stays clean and accurate.
- The geospatial insert and query used `ST_MakePoint(...)` directly for a `GEOGRAPHY` column/query. CockroachDB's point examples set SRID 4326 explicitly for longitude/latitude points, and `ST_DWithin` on geography expects geography inputs. I changed both examples to `ST_SetSRID(ST_MakePoint(...), 4326)::GEOGRAPHY`.

## Review Notes
- The CockroachDB Docker image tag `cockroachdb/cockroach:v25.2.18` is valid and documented in the official v25.2 release notes.
- The use of separated SQL and inter-node ports is consistent with CockroachDB's Docker guidance; `cockroach init` correctly targets the inter-node/listen address when SQL and inter-node traffic are separated.
- The tutorial remains appropriate for a local or development Portainer stack because it uses `--insecure`. The production section correctly switches to `--certs-dir`, but a complete production deployment would also need secure initialization and client authentication details.
