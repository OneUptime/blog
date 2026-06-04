# Validation Summary: How to Run TiDB in Docker for Distributed SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- TiDB v8.1
- TiKV
- PD (Placement Driver)
- Docker Compose
- MySQL protocol and SQL
- Dumpling
- Prometheus
- Grafana

## Sources Consulted
- TiDB Architecture v8.1: https://docs.pingcap.com/tidb/v8.1/tidb-architecture/
- TiDB AUTO_RANDOM v8.1: https://docs.pingcap.com/tidb/v8.1/auto-random/
- TiDB Transactions v8.1: https://docs.pingcap.com/tidb/v8.1/transaction-overview/
- TiDB FAQ v8.1: https://docs.pingcap.com/tidb/v8.1/tidb-faq/
- TiDB PD command-line flags v8.1: https://docs.pingcap.com/tidb/v8.1/command-line-flags-for-pd-configuration/
- TiKV command-line flags: https://docs.pingcap.com/tidb/dev/command-line-flags-for-tikv-configuration/
- TiDB command-line flags: https://docs.pingcap.com/tidb/dev/command-line-flags-for-tidb-configuration/
- TiDB Dashboard access: https://docs.pingcap.com/tidb/stable/dashboard-access/
- Dumpling overview v8.1: https://docs.pingcap.com/tidb/v8.1/dumpling-overview/
- Docker Compose version and name elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose networking guide: https://docs.docker.com/compose/how-tos/networking/

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` property. Removed it because current Docker Compose uses the Compose Specification and treats `version` as only informative with an obsolete warning.
- The standalone `docker run --network tidb-net` commands assumed the Compose network would be named exactly `tidb-net`. Added `name: tidb-net` to the network definition so the commands work regardless of the Compose project name.
- The MySQL client and Dumpling examples used the container name as the database host. Changed them to the Compose service name `tidb`, which is the stable service DNS name on the Compose network.
- The sample data assumed `AUTO_RANDOM` IDs would be sequential values such as `1`, `2`, and `4`. TiDB `AUTO_RANDOM` generates random unique IDs when the column is omitted, so the order inserts and transaction now look up product IDs by product name instead of assuming generated values.
- The Dumpling Docker example wrote output only inside a removed container. Added a host-mounted `./dumpling-output` directory so the logical backup files persist after the container exits.

## Review Notes
The post remains a local development tutorial, not production deployment guidance. A single PD node is acceptable for this local Docker Compose example, but PingCAP recommends multiple PD nodes for high availability in real deployments.
