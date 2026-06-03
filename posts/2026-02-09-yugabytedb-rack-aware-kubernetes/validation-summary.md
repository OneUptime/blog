# Validation Summary: How to Set Up YugabyteDB with Rack-Aware Placement on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- YugabyteDB
- YugabyteDB Helm chart
- Kubernetes
- Helm
- YSQL / PostgreSQL-compatible clients
- Prometheus Operator ServiceMonitor

## Sources Consulted
- YugabyteDB documentation: Deploy on OSS Kubernetes using Helm Chart - https://docs.yugabyte.com/stable/deploy/kubernetes/single-zone/oss/helm-chart/
- YugabyteDB documentation: Deploy on Google Kubernetes Engine using Helm Chart - https://docs.yugabyte.com/stable/deploy/kubernetes/multi-zone/gke/helm-chart/
- YugabyteDB documentation: yb-admin command reference - https://docs.yugabyte.com/stable/admin/yb-admin/
- YugabyteDB documentation: Handling rack failures - https://docs.yugabyte.com/stable/explore/fault-tolerance/handling-rack-failures/
- YugabyteDB documentation: CREATE TABLE / SPLIT INTO - https://docs.yugabyte.com/stable/api/ysql/the-sql-language/statements/ddl_create_table/
- YugabyteDB documentation: Cluster-wide tablet metadata - https://docs.yugabyte.com/stable/explore/observability/yb-tablet-metadata/
- YugabyteDB documentation: Metrics - https://docs.yugabyte.com/stable/launch-and-manage/monitor-and-alert/metrics/
- YugabyteDB Helm chart values - https://raw.githubusercontent.com/yugabyte/charts/master/stable/yugabyte/values.yaml

## Issues Found
- The original single-release Helm deployment did not match YugabyteDB's documented multi-zone Helm deployment. Replaced it with one Helm release per zone using `isMultiAz`, `AZ`, `masterAddresses`, and `gflags.*.placement_*`, followed by `yb-admin modify_placement_info`.
- The advanced values file used unsupported or incorrect chart fields, including lowercase `image`, duplicate `tserver` keys, `customStartScript`, and placement values under `extraEnv`. Replaced these with chart-supported `Image`, `gflags`, `serviceMonitor`, and multi-AZ values.
- The post implied Kubernetes node labels alone tell YugabyteDB how to distribute replicas. Clarified that Kubernetes labels influence scheduling, while YugabyteDB uses placement flags and placement policy for tablet replica placement.
- Verification commands used single-namespace master service names and an invalid `list_tablets` invocation. Updated them to use multi-zone master addresses and `yb_servers()` / `yb_tablet_metadata`.
- The SQL verification used `pg_stat_replication`, which is not the right way to inspect YugabyteDB tablet replication. Replaced it with `yb_tablet_metadata` and `yb_servers()`.
- The leader preference example incorrectly used `modify_placement_info` with a preferred zone argument. Replaced it with `set_preferred_zones`.
- The Prometheus ServiceMonitor example selected `monitoring: prometheus` pod labels, but ServiceMonitor selects services and the Helm chart already supports ServiceMonitor generation. Replaced it with the chart's `serviceMonitor` values.
- Several metrics were inaccurate or misleading for this context. Replaced them with `ts_live_tablet_peers`, `yb_servers()`, `yb_tablet_metadata`, and scoped xCluster lag to xCluster use cases.
- The failure test used `list_tablet_servers`, which requires a tablet ID. Replaced it with `list_all_tablet_servers`.
- The scaling example changed only one single release to 12 TServers. Updated it to scale one zone to 4 TServers and note that the same upgrade should be repeated in each zone namespace.
- The backup section used `create_snapshot ysql.myapp` and `export_snapshot` to S3. Replaced it with `create_database_snapshot myapp` and clarified that `export_snapshot` exports metadata to a file, while object-store backups should use YugabyteDB backup tooling.

## Review Notes
The article is now technically aligned with the official YugabyteDB Helm chart and yb-admin references. A future improvement would be to include provider-specific node affinity or storage class examples for AWS EKS/GKE, but that would be additional depth rather than a correctness fix.
