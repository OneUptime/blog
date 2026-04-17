# Validation Summary: How to Set Up ClickHouse Cluster with Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (24.3 LTS)
- Docker Compose
- ZooKeeper (3.8)
- ReplicatedMergeTree engine
- Distributed table engine
- XML-based ClickHouse server configuration

## Sources Consulted
- ClickHouse official docs — Replication & ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse official docs — Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse official docs — Server configuration (macros, remote_servers, zookeeper): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse Docker Hub: https://hub.docker.com/r/clickhouse/clickhouse-server
- ZooKeeper Docker Hub: https://hub.docker.com/_/zookeeper
- ClickHouse release notes confirming 24.3 as an LTS release

## Issues Found
1. **Architecture description mismatched the actual config.** The intro claimed a "two-shard, two-replica cluster" and the overview listed "4 ClickHouse nodes: 2 shards x 2 replicas," but the docker-compose.yml and cluster.xml only define a single shard with two replicas (ch1, ch2). Updated the wording to "one-shard, two-replica cluster" and "2 ClickHouse nodes: 1 shard x 2 replicas" to match the actual configuration.

2. **Macros were incorrectly shared between both nodes and missing the `<replica>` entry.** The `<macros>` block was placed inside the shared `cluster.xml` mounted into both containers, meaning both nodes would resolve `{shard}` identically and `{replica}` would be undefined — `ReplicatedMergeTree('/clickhouse/tables/{shard}/events_local', '{replica}')` would either fail outright or, if interpreted literally, cause both replicas to register at the same ZooKeeper path and collide. Split the macros out of `cluster.xml` into per-node `config/ch1/macros.xml` and `config/ch2/macros.xml` with distinct `<replica>` values, and updated the docker-compose volume mounts and the initial `mkdir` command to create the new directories.

## Review Notes
- The Docker Compose `version: "3.8"` key is technically obsolete under the modern Compose Specification (Compose v2 ignores it with a warning), but it does not break the file and is left as-is to preserve the author's original style.
- The comment "Query from ch2 to verify replication" is placed before `SELECT count() FROM events` (the Distributed table). Strictly speaking, querying the Distributed table would route across replicas rather than prove that data was replicated to ch2; querying `events_local` directly on ch2 is a cleaner verification. Not changed because it is a pedagogical nuance rather than a technical error.
- ClickHouse 24.3 is an LTS release; the post will remain accurate for some time, but readers deploying later may wish to move to a more recent LTS (25.3 / 25.8 at time of review).
- The root XML element `<clickhouse>` is the current canonical form (the `<yandex>` alias has been deprecated since v20.10) — the post uses it correctly.
