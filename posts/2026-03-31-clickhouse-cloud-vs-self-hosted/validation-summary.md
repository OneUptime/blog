# Validation Summary: How to Use ClickHouse Cloud vs Self-Hosted ClickHouse

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- ClickHouse (core engine, MergeTree, ReplicatedMergeTree, SharedMergeTree)
- ClickHouse Cloud (managed SaaS)
- ClickHouse Keeper / ZooKeeper
- clickhouse-client CLI and HTTP interface
- APT / Debian packaging (packages.clickhouse.com)
- Docker (clickhouse/clickhouse-server image)
- Kubernetes / Helm (Altinity ClickHouse Operator)
- AWS EC2 / EBS / S3
- Prometheus + Grafana monitoring
- ClickHouse `s3` table function (Parquet export/import)

## Sources Consulted
- ClickHouse Debian/Ubuntu install docs: https://clickhouse.com/docs/install/debian_ubuntu
- ClickHouse `system.metrics` reference: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse `s3` table function: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse Prometheus interface: https://clickhouse.com/docs/interfaces/prometheus
- ClickHouse TLS configuration (ports 9440 / 8443): https://clickhouse.com/docs/guides/sre/tls/configuring-tls
- SharedMergeTree on ClickHouse Cloud: https://clickhouse.com/docs/cloud/reference/shared-merge-tree
- Altinity ClickHouse Operator quickstart: https://docs.altinity.com/altinitykubernetesoperator/quickstartinstallation/
- Altinity Helm charts repo: https://helm.altinity.com/
- Grafana ClickHouse dashboard 14192: https://grafana.com/grafana/dashboards/14192-clickhouse/

## Issues Found
1. **Altinity Operator Helm repo URL was wrong.** The post used `https://docs.altinity.com/clickhouse-operator/`, which is a docs URL rather than a Helm repository. Changed to the current official `https://helm.altinity.com` so `helm repo add` actually works.
2. **Partitioned S3 export SQL was broken.** The example used `{_partition_id}` in the S3 URL but omitted the required `PARTITION BY` clause, so ClickHouse would not substitute the placeholder. Added `PARTITION BY toYYYYMM(occurred_at)` between the `s3()` function and the `SELECT` to match the table's partitioning scheme and make the snippet runnable.
3. **Grafana dashboard 14192 was labelled "official".** Dashboard 14192 is a community dashboard, not an official ClickHouse Inc. deliverable. Changed the wording from "official" to "community".

## Review Notes
- The ClickHouse APT install snippet uses `apt-key`-style key import via `gpg --recv-keys` into a signed-by keyring; this works today, but the ClickHouse docs increasingly recommend pulling the key directly from `packages.clickhouse.com` rather than a public keyserver. Not changed since the current form still works.
- The cluster XML snippet is a partial include (just `<remote_servers>...`); in a real config it must live inside a `<clickhouse>` root element or an included file. The author's `<!-- Cluster definition -->` comment makes the partial-snippet intent clear, so left as-is.
- Cost numbers (EC2 r6a.4xlarge, EBS, ClickHouse Cloud storage) are illustrative ranges and may drift with AWS / ClickHouse Cloud pricing changes; readers should confirm against current pricing pages.
- Port 9440 (secure native TCP), 8443 (HTTPS), 9000 (native TCP), 8123 (HTTP), and 9363 (Prometheus) are all correct as of review.
- ClickHouse Cloud's automatic upgrade of `MergeTree` → `SharedMergeTree` (and related engines) is accurate and documented.
