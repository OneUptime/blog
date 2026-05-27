# Validation Summary: How to Deploy ClickHouse on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- Altinity Kubernetes Operator for ClickHouse
- Kubernetes
- Kubernetes StatefulSets, Services, and PersistentVolumeClaims
- SQL DDL for ReplicatedMergeTree and Distributed tables

## Sources Consulted
- Altinity Kubernetes Operator installation documentation: https://docs.altinity.com/altinitykubernetesoperator/quickstartinstallation/
- Altinity Kubernetes Operator GitHub repository and release manifests: https://github.com/Altinity/clickhouse-operator
- Altinity ClickHouseInstallation cluster settings documentation: https://docs.altinity.com/altinitykubernetesoperator/kubernetesoperatorguide/clustersettings/
- Altinity ClickHouseKeeperInstallation example: https://github.com/Altinity/clickhouse-operator/blob/0.27.0/docs/chk-examples/01-simple-3.yaml
- Altinity ClickHouseInstallation Keeper reference example: https://github.com/Altinity/clickhouse-operator/blob/0.27.0/docs/chi-examples/04-replication-zookeeper-07-keeper-ref.yaml
- ClickHouse Keeper documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse CREATE DATABASE documentation: https://clickhouse.com/docs/sql-reference/statements/create/database
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse ReplicatedMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse Distributed table engine documentation: https://clickhouse.com/docs/engines/table-engines/special/distributed
- Docker Official Image documentation for ClickHouse tags: https://hub.docker.com/_/clickhouse

## Issues Found
- The operator install URL used the moving `master` branch. Changed it to the current released `0.27.0` bundle so the tutorial is reproducible and matches the current operator CRDs.
- The ClickHouse Keeper example used a raw Kubernetes StatefulSet without the required Keeper server configuration. Replaced it with the operator-supported `ClickHouseKeeperInstallation` resource.
- The ClickHouseInstallation manually listed Keeper DNS names. Updated it to use the operator's `zookeeper.keeper.name` reference so Keeper endpoints are discovered by the operator.
- Query-level ClickHouse settings were placed under `spec.configuration.settings`, which renders server configuration. Moved them into the `profiles` section where user/query settings belong.
- The ClickHouse container image used the floating `latest` tag. Pinned it to the current LTS branch tag `clickhouse/clickhouse-server:26.3`.
- The SQL examples created tables inside the `analytics` database before creating that database. Added `CREATE DATABASE IF NOT EXISTS analytics ON CLUSTER analytics;`.
- The health-check query used `totalBytesOfMergeTreeTables()`, which is not documented as a current ClickHouse function. Replaced it with a query against `system.parts`.
- The metrics diagram referenced port `8001`, which does not match the operator metrics service in the current manifest. Updated it to `8888/9999`.

## Review Notes
The examples were reviewed against current documentation and release manifests, but they were not applied to a live Kubernetes cluster because `kubectl` is not installed in this workspace. In a production version, consider adding persistent storage templates for ClickHouseKeeperInstallation and avoiding plaintext passwords in the ClickHouseInstallation manifest.
