# Validation Summary: How to Deploy ClickHouse with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD Applications and resource hooks
- Kubernetes custom resources and Jobs
- Altinity Kubernetes Operator for ClickHouse
- ClickHouseKeeperInstallation and ClickHouseInstallation resources
- ClickHouse Keeper
- ClickHouse SQL, ReplicatedMergeTree, Distributed tables, TTL
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Altinity Operator installation documentation: https://docs.altinity.com/altinitykubernetesoperator/quickstartinstallation/
- Altinity ClickHouse Operator GitHub releases: https://github.com/Altinity/clickhouse-operator/releases
- Altinity ClickHouse Operator Helm chart values/templates: https://github.com/Altinity/clickhouse-operator/tree/master/deploy/helm/clickhouse-operator
- Altinity ClickHouseKeeperInstallation examples: https://github.com/Altinity/clickhouse-operator/tree/master/docs/chk-examples
- Altinity ClickHouseInstallation custom resource examples/specification: https://github.com/Altinity/clickhouse-operator/blob/master/docs/custom_resource_explained.md
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- ClickHouse CREATE DATABASE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/database
- ClickHouse Docker official image documentation: https://hub.docker.com/_/clickhouse
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The Helm repository URL used the deprecated `https://docs.altinity.com/clickhouse-operator/` repo. Changed it to `https://helm.altinity.com` and updated the chart version to the current `0.27.0` release.
- The Keeper custom resource used the wrong API group. Changed `apiVersion` from `clickhouse.altinity.com/v1` to `clickhouse-keeper.altinity.com/v1`.
- The Keeper PVC template was defined but not referenced. Added `spec.defaults.templates` so the pod and data volume templates are used.
- The ClickHouse cluster referenced Keeper by hand-written pod DNS names that do not match the documented CHK service pattern. Updated it to the operator-supported `zookeeper.keeper.name` reference available in operator `0.27.0`.
- Query/profile settings were placed under server-level `configuration.settings`. Moved `max_memory_usage`, `max_memory_usage_for_all_queries`, and `max_threads` into the default profile.
- The ClickHouse and Keeper image tags were old relative to the updated operator and Keeper defaults. Updated them to the current supported `25.8` branch tags.
- The password hash placeholders were not valid SHA-256 hex values. Replaced them with valid SHA-256 hashes for example credentials.
- The user network configuration allowed only IPv6. Changed it to include both `0.0.0.0/0` and `::/0`.
- The schema migration used a `PreSync` hook, which can run before the ClickHouse resources exist in the same application. Changed it to `PostSync`.
- The schema migration set `CLICKHOUSE_PORT` to HTTP port `8123` but invoked `clickhouse-client` on native port `9000`. Set the environment variable to `9000` and used it in the command.
- The schema migration used an incorrect likely cluster service name. Changed it to the documented operator service pattern `clickhouse-analytics.clickhouse.svc.cluster.local`.
- The migration created tables in the `analytics` database without creating the database first. Added `CREATE DATABASE IF NOT EXISTS analytics ON CLUSTER 'analytics';`.
- The ServiceMonitor example selected ClickHouse instance labels and a non-existent `exporter` port. Updated it to target the operator metrics service labels and the `ch-metrics` / `op-metrics` ports used by the Helm chart.

## Review Notes
- The YAML snippets were parsed successfully after edits.
- The manifests were validated against documentation and CRD examples, but not applied to a live Kubernetes cluster.
- The example SHA-256 password hashes are suitable as syntactically valid placeholders only; production deployments should source credentials from Kubernetes Secrets or an external secret manager.
