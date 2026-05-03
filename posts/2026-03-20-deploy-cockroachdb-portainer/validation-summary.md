# Validation Summary: How to Deploy CockroachDB via Portainer - Deploy

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- CockroachDB (v23.2.0)
- Portainer
- Docker / Docker Compose
- PostgreSQL wire protocol
- psycopg2 (Python PostgreSQL driver)
- TLS / Certificate management

## Sources Consulted
- CockroachDB `cockroach start` reference: https://www.cockroachlabs.com/docs/v23.2/cockroach-start
- CockroachDB Docker quickstart: https://www.cockroachlabs.com/docs/v23.2/start-a-local-cluster-in-docker-linux
- CockroachDB `cockroach cert` reference: https://www.cockroachlabs.com/docs/v23.2/cockroach-cert
- CockroachDB `CREATE USER` reference: https://www.cockroachlabs.com/docs/v23.2/create-user
- Docker Compose file reference for version 3.8

## Issues Found
No technical issues found.

- The `cockroach start` flags (`--insecure`, `--join`, `--listen-addr`, `--advertise-addr`, `--http-addr`) are all valid and correctly used.
- The `cockroach init --insecure --host=roach1:26257` command is correct; flag ordering is flexible.
- The `CREATE USER username WITH PASSWORD 'password'` SQL is valid in CockroachDB (the `LOGIN` keyword is optional).
- The `GRANT ALL ON DATABASE` syntax is valid.
- The `cockroach cert create-ca / create-node / create-client` commands match documented syntax with required `--certs-dir` and `--ca-key` flags.
- CockroachDB v23.2.0 is a real released version.
- PostgreSQL wire-protocol compatibility is accurate; psycopg2 works with CockroachDB.
- Docker Compose v3.8 is a valid version for the stack file.
- The use of distinct internal HTTP ports per node (8080/8081/8082) via `--http-addr` paired with matching host port mappings is unconventional but works.

## Review Notes
- In `--insecure` mode, CockroachDB does not actually enforce password authentication, so the password set via `CREATE USER ... WITH PASSWORD` and supplied in the psycopg2 connection string is effectively ignored. The example will still work as written, but the password is meaningful only after switching to secure mode (`--certs-dir`).
- For production TLS setup, `cockroach cert create-node` should typically include all hostnames/IPs the node may be reached at (e.g., `roach1 localhost <public-ip>`), not just one. The current example covers only the Docker network hostname, which is sufficient for intra-cluster communication but may need additional SANs for client access from outside the Docker network.
- The `docker ps -qf name=roach1` filter is a substring match and could in principle match `roach10`, etc. Not relevant to this 3-4 node example, but worth noting if the cluster grows.
- CockroachDB v23.2 reaches end of support in November 2025. Readers running this tutorial well after publication should consider upgrading to a more current major version (e.g., v24.x).
