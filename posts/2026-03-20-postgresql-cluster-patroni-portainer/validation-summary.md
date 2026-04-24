# Validation Summary: How to Deploy a PostgreSQL Cluster with Patroni via Portainer - Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- PostgreSQL
- Patroni
- etcd
- HAProxy
- PgBouncer
- Python
- psycopg2

## Sources Consulted
- Patroni documentation: https://patroni.readthedocs.io/en/latest/
- Patroni 3.2 documentation PDF for version-specific CLI and REST API behavior: https://patroni.readthedocs.io/_/downloads/en/rel_3_2/pdf/
- Patroni environment configuration settings: https://patroni.readthedocs.io/en/latest/ENVIRONMENT.html
- Patroni REST API documentation: https://patroni.readthedocs.io/en/latest/rest_api.html
- Patroni `patronictl` documentation: https://patroni.readthedocs.io/en/latest/patronictl.html
- Patroni official Docker image entrypoint: https://raw.githubusercontent.com/patroni/patroni/master/docker/entrypoint.sh
- Patroni official Dockerfile: https://github.com/patroni/patroni/blob/master/Dockerfile
- etcd configuration options: https://etcd.io/docs/v3.4/op-guide/configuration/
- etcd failure tolerance and quorum guidance: https://etcd.io/docs/v3.2/faq/ and https://etcd.io/docs/v3.5/op-guide/failures/
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/
- Psycopg2 connection pool docs: https://www.psycopg.org/docs/pool.html
- Bitnami PgBouncer container README: https://raw.githubusercontent.com/bitnami/containers/main/bitnami/pgbouncer/README.md

## Issues Found
- The description said HAProxy provided connection pooling. I changed that to connection routing because HAProxy is being used here as a TCP router/load balancer, while PgBouncer is the actual connection pooler.
- The original stack used a single etcd node while describing a highly available Patroni deployment. Patroni’s own docs require the DCS to run with 3 or 5 nodes for proper consensus and fault tolerance, so I replaced the single etcd service with a 3-node etcd quorum and updated the Patroni `PATRONI_ETCD3_HOSTS` values accordingly.
- The Compose file mounted `./patroni/patroni.yml`, but the post never provided that file. I removed that mount and updated the `patronictl` examples to use the official image’s built-in `/home/postgres/postgres0.yml`, which matches the official Patroni container entrypoint behavior.
- The HAProxy and curl examples used the older `/master` endpoint. I updated them to `/primary`, which is the current Patroni health-check endpoint for the writable node and is supported by Patroni 3.2.x.
- The manual topology change example used `patronictl failover ... --master`, which is not correct for Patroni 3.2.x and is the wrong operation for a healthy cluster. I changed it to `patronictl switchover ... --leader ... --candidate ... --force`.
- The architecture diagram showed etcd as if it were attached to only one replica. I corrected it to represent etcd as a quorum used by the Patroni cluster.

## Review Notes
- The pinned component versions are older than current releases as of April 24, 2026, but the post remains technically coherent after the fixes above.
- The PgBouncer example uses `bitnami/pgbouncer:latest`, which is a rolling tag. A pinned image tag would be safer for long-term reproducibility.
