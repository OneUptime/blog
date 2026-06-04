# Validation Summary: How to Run CockroachDB in Docker with Clustering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB
- Docker
- Docker Compose
- HAProxy
- PostgreSQL-compatible SQL clients
- TLS certificates
- SQL backup and restore
- CockroachDB replication zones and health checks

## Sources Consulted
- CockroachDB Docs: Deploy a Local Cluster in Docker (Insecure) - https://www.cockroachlabs.com/docs/stable/start-a-local-cluster-in-docker-linux
- CockroachDB Docs: cockroach start - https://www.cockroachlabs.com/docs/stable/cockroach-start.html
- CockroachDB Docs: cockroach start-single-node - https://www.cockroachlabs.com/docs/stable/cockroach-start-single-node
- CockroachDB Docs: cockroach init - https://www.cockroachlabs.com/docs/stable/cockroach-init
- CockroachDB Docs: cockroach cert - https://www.cockroachlabs.com/docs/stable/cockroach-cert
- CockroachDB Docs: SHOW RANGES - https://www.cockroachlabs.com/docs/stable/show-ranges
- CockroachDB Docs: BACKUP - https://www.cockroachlabs.com/docs/stable/backup
- CockroachDB Docs: RESTORE - https://www.cockroachlabs.com/docs/stable/restore
- CockroachDB Docs: Replication Controls - https://www.cockroachlabs.com/docs/stable/configure-replication-zones
- CockroachDB Docs: Monitoring and Alerting - https://www.cockroachlabs.com/docs/stable/monitoring-and-alerting
- Docker Docs: Control startup and shutdown order in Compose - https://docs.docker.com/compose/how-tos/startup-order/

## Issues Found
- The CockroachDB image tag was pinned to `v23.2.3`, while the current official Docker examples use `v26.2.1`. Updated the image tag throughout the post.
- The Compose `init` service depended on `roach1` being `service_healthy`, but the healthcheck used a SQL cluster-status command that can require the cluster to be initialized first. This could deadlock startup. Changed the init dependency to wait for all three node containers to be started instead.
- The cluster architecture diagram and text implied that `roach2` and `roach3` listen internally on ports 26258 and 26259. In the Compose file, those are host port mappings; each container listens on 26257 internally. Updated the diagram and explanation.
- The backup example used `BACKUP DATABASE ... TO`, and the restore example used direct `RESTORE ... FROM {storage_uri}` syntax. CockroachDB v24.3 and later removed that older syntax. Updated the examples to `BACKUP ... INTO` and `RESTORE ... FROM LATEST IN`.
- The restore example attempted to restore `myapp` over an existing database. Updated it to restore into `myapp_restored` with `new_db_name`.
- The range-distribution admin command queried `crdb_internal.ranges_no_leases`, an unstable internal table that is restricted by default in current CockroachDB. Replaced it with the supported `SHOW RANGES FROM TABLE myapp.users WITH DETAILS`.

## Review Notes
- Docker Hub rate limiting prevented local execution of the CockroachDB Docker image for live CLI checks. The review was completed against current official Cockroach Labs and Docker documentation.
- The post uses insecure CockroachDB mode for local development examples, which is technically correct for testing but remains inappropriate for production.
- The Docker Compose example runs all nodes on one Docker host. It is useful for testing cluster behavior, but it is not a production high-availability topology because the host remains a single point of failure.
