# Validation Summary: How to Deploy Cassandra via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Cassandra
- Docker Compose
- Portainer
- Python
- DataStax / Apache Cassandra Python driver
- `nodetool`
- `cqlsh`

## Sources Consulted
- Apache Cassandra security documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/security.html
- Apache Cassandra CQL security and role syntax: https://cassandra.apache.org/doc/4.1/cassandra/cql/security.html
- Apache Cassandra backup documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/backups.html
- Apache Cassandra repair documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/repair.html
- Apache Cassandra `nodetool tablestats` reference: https://cassandra.apache.org/doc/4.0/cassandra/tools/nodetool/tablestats.html
- Docker Compose startup order and `service_healthy`: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Official Image for Cassandra: https://hub.docker.com/_/cassandra
- DataStax Python driver getting started: https://docs.datastax.com/en/developer/python-driver/3.15/getting_started/index.html
- DataStax Python driver `ConsistencyLevel` API docs: https://docs.datastax.com/en/developer/python-driver/3.25/api/cassandra/index.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- `dcagatay/cassandra-web` image documentation: https://github.com/dogukancagatay/docker-cassandra-web

## Issues Found
- The post used `CASSANDRA_AUTHENTICATOR` and `CASSANDRA_AUTHORIZER` environment variables with the official `cassandra:4.1` image. The Docker Official Image does not support those variables, so authentication and authorization would not actually be enabled. I replaced them with a startup command that updates `cassandra.yaml` before handing control back to the image entrypoint.
- The post set `CASSANDRA_DC` and `CASSANDRA_RACK` without setting `CASSANDRA_ENDPOINT_SNITCH=GossipingPropertyFileSnitch`. The Docker image docs state the DC/rack settings only take effect with that snitch. I added the snitch setting to all three nodes.
- `depends_on: condition: service_healthy` was used for `cassandra2` and `cassandra3`, but those services had no healthchecks. I added explicit `cqlsh`-based healthchecks to all Cassandra nodes so the dependency conditions are valid and actually reflect CQL readiness.
- The post referenced `rancher/cassandra-web:latest`, which was not publicly pullable during validation. I replaced it with `dcagatay/cassandra-web:latest`, which is pullable and documents the correct environment variables, including its requirement for IP addresses rather than hostnames.
- The post enabled Cassandra auth but did not update the `system_auth` keyspace replication for a three-node cluster. Cassandra documentation recommends increasing `system_auth` replication for non-trivial deployments. I added `ALTER KEYSPACE system_auth ... 'dc1': 3`.
- After increasing `system_auth` replication, the post did not repair the keyspace to distribute existing auth data to the new replicas. I added `nodetool repair --full -pr system_auth` on each node.
- The Python example imported `ConsistencyLevel` from the wrong module and used `DCAwareRoundRobinPolicy` without importing it. I corrected the imports to match the documented driver API.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. I replaced it with `datetime.now(timezone.utc)`.
- The Python example implied direct access to all three Cassandra hosts without clarifying network context. I updated it to run from another container on `cassandra_net` and use a single contact point, which the driver then expands through discovery.
- The backup script copied the entire keyspace directory instead of the snapshot directories created by `nodetool snapshot`. Cassandra snapshots live under per-table `snapshots/<tag>` directories. I changed the script to archive only those snapshot directories and to clear snapshots for the specific keyspace.
- The compose snippet still declared `version: "3.8"`, which current Docker Compose treats as obsolete. I removed it.
- The conclusion overstated fault tolerance for a three-container cluster running on one Docker host. I revised it to distinguish node/container failure tolerance from host-level single points of failure.

## Review Notes
- The post is now technically consistent for a single-host Portainer or Docker Compose deployment, but it is still a single-host cluster. For real host-level fault tolerance, the Cassandra nodes need to run on separate hosts or VMs.
- `CREATE INDEX` on `users.email` is syntactically correct, but secondary indexes in Cassandra have workload-specific tradeoffs and are often a poor fit for large-scale high-cardinality access patterns.
- The replacement Cassandra web UI image is third-party rather than Apache-managed. I verified that `dcagatay/cassandra-web:latest` was pullable locally during review, but long-term maintenance risk remains higher than for the official Cassandra image.
