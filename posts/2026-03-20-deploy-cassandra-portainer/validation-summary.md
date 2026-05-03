# Validation Summary: How to Deploy Apache Cassandra via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Cassandra 4.1
- Docker / Docker Compose
- Portainer (stack deployment)
- CQL (Cassandra Query Language)
- nodetool (Cassandra admin CLI)
- Python cassandra-driver
- GossipingPropertyFileSnitch (Cassandra snitch)
- NetworkTopologyStrategy (replication)

## Sources Consulted
- Official Cassandra Docker image documentation: https://hub.docker.com/_/cassandra
- Apache Cassandra 4.1 documentation: https://cassandra.apache.org/doc/4.1/
- nodetool reference: https://cassandra.apache.org/doc/4.1/cassandra/tools/nodetool/nodetool.html
- CQL reference (CREATE KEYSPACE / NetworkTopologyStrategy): https://cassandra.apache.org/doc/4.1/cassandra/cql/ddl.html
- DataStax Python driver documentation: https://docs.datastax.com/en/developer/python-driver/
- Docker Compose v3 healthcheck/depends_on docs: https://docs.docker.com/compose/compose-file/

## Issues Found
No technical issues found.

- The Compose file uses valid environment variables recognized by the official `cassandra:4.1` image (`CASSANDRA_CLUSTER_NAME`, `CASSANDRA_DC`, `CASSANDRA_RACK`, `CASSANDRA_SEEDS`, `CASSANDRA_ENDPOINT_SNITCH`, `MAX_HEAP_SIZE`, `HEAP_NEWSIZE`).
- `GossipingPropertyFileSnitch` is the correct snitch to pair with `CASSANDRA_DC`/`CASSANDRA_RACK` settings.
- The healthcheck (`nodetool status | grep -E '^UN'`) correctly returns success once at least one node is Up/Normal.
- `depends_on` with `condition: service_healthy` is valid Compose v3 syntax and ensures sequential bootstrap.
- CQL syntax for `CREATE KEYSPACE` with `NetworkTopologyStrategy` and the per-DC replication factor is correct; the DC name (`datacenter1`) matches `CASSANDRA_DC`.
- `uuid()` and `toTimestamp(now())` are valid CQL functions in 4.1.
- `nodetool compact <keyspace> <table>` and `nodetool repair <keyspace>` invocations are syntactically correct.
- Python driver usage (`Cluster(contact_points=..., port=9042)`, `cluster.connect('keyspace')`, `session.execute(...)`) matches the current DataStax Python driver API. Port 9042 is the correct default native CQL port.

## Review Notes
- The unused `from cassandra.auth import PlainTextAuthProvider` import in the Python snippet is harmless and likely included to hint at how to add auth later. Not a technical error.
- For production, listing multiple seed nodes in `CASSANDRA_SEEDS` (e.g., `cassandra1,cassandra2`) is recommended for resilience, but a single seed works for bootstrapping a small cluster as shown.
- `MAX_HEAP_SIZE: "512M"` / `HEAP_NEWSIZE: "100M"` are intentionally small for demo/Portainer-host scenarios; production deployments would use 8–16 GB heaps. Acceptable for the tutorial scope.
- `version: "3.8"` in the Compose file is still accepted but is no longer required by current Compose specs; not an error.
- Cassandra 5.0 was released in 2024 and is GA; 4.1 remains supported and is a reasonable, stable choice for the tutorial.
- Using container hostnames (`cassandra1`, etc.) as Python `contact_points` only resolves from within the same Docker network. Readers connecting from outside should map a port and use `localhost`/host IP. Not incorrect, just an implicit assumption.
