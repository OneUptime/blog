# Validation Summary: How to Set Up ClickHouse on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, sysctls, disks, talosctl)
- ClickHouse (server 24.1, ReplicatedMergeTree, Distributed engine, ClickHouse Keeper)
- Altinity ClickHouse Operator (ClickHouseInstallation CRD, clickhouse.altinity.com/v1)
- Apache ZooKeeper (3.9, StatefulSet)
- Kubernetes (StatefulSets, Services, PVCs, downward API)

## Sources Consulted
- Talos Linux machine config reference: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- talosctl `patch mc` / `apply-config` docs: https://www.talos.dev/v1.7/reference/cli/
- Altinity ClickHouse Operator quick start: https://github.com/Altinity/clickhouse-operator/blob/master/docs/quick_start.md
- Altinity operator install bundle: https://raw.githubusercontent.com/Altinity/clickhouse-operator/master/deploy/operator/clickhouse-operator-install-bundle.yaml
- ClickHouse Distributed engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse ReplicatedMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- Apache ZooKeeper Docker image: https://hub.docker.com/_/zookeeper

## Issues Found

1. **`talosctl apply-config` used with a partial machine config (CRITICAL)** — The original used `talosctl apply-config --file talos-clickhouse-patch.yaml` with a file containing only `machine.sysctls` and `machine.disks`. `apply-config` REPLACES the full machine config, which would have wiped node identity, networking, and Kubernetes config, breaking the node. Fixed by switching to `talosctl patch mc --patch @talos-clickhouse-patch.yaml`, which performs a strategic merge against the running config.

2. **ZooKeeper `ZOO_MY_ID` derived from `metadata.name` (CRITICAL)** — The original set `ZOO_MY_ID` via downward API `fieldRef: metadata.name`, which produces a string like `zookeeper-0`. The `zookeeper:3.9` image requires `ZOO_MY_ID` to be an integer 1–255, so the pods would have failed to start (or written an invalid `/data/myid`). Fixed by adding an `initContainers` block that derives the integer from the pod hostname ordinal and writes it to `/data/myid` (which the entrypoint reads when `ZOO_MY_ID` is unset). Removed the broken `ZOO_MY_ID` env var.

## Review Notes

- `clickhouse/clickhouse-server:24.1` is a real released tag but is now several minor versions behind; readers may want a newer LTS tag in production. Not a correctness issue at the time of writing.
- The Altinity operator's `users` config format accepts plaintext passwords (`analytics_user/password: "..."`), but for production deployments `password_sha256_hex` is preferable; this is a hardening note, not an error.
- `max_execution_time` is a query/profile setting; placing it under top-level `settings` works because the operator translates these to the appropriate config sections, but the more idiomatic placement is under `profiles`. The post already sets it in both, so this is fine.
- The ClickHouse Keeper snippet is a partial example and intentionally elides full coordination/raft settings; readers deploying Keeper for real will need the additional `raft_configuration` block. Acceptable as a "here's where these settings live" pointer.
- The Talos `mountpoint` `/var/lib/clickhouse-data` is acceptable because it lives under `/var/` (Talos requires user disk mounts to be inside `/var/`).
