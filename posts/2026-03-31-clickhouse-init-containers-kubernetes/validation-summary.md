# Validation Summary: How to Use Init Containers for ClickHouse on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server and Keeper)
- Kubernetes (init containers, StatefulSet, securityContext, volumeMounts)
- BusyBox (utility image)
- HashiCorp Vault (secrets management)
- Linux sysctl / kernel parameters (`vm.max_map_count`, `net.core.somaxconn`, `vm.overcommit_memory`)

## Sources Consulted
- ClickHouse Keeper documentation: https://clickhouse.com/docs/operations/clickhouse-keeper (confirmed default port 9181 for standalone keeper binary)
- ClickHouse SRE / Keeper guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse Docker image documentation (confirmed default UID 101 for the `clickhouse` user in `clickhouse/clickhouse-server`)
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes securityContext documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- HashiCorp Vault CLI documentation for `vault kv get -field=` (syntax verified)

## Issues Found
- **Incorrect ClickHouse Keeper port (2181 → 9181)**: The "Waiting for ClickHouse Keeper" and "Full Init Container Spec" examples used port `2181`, which is ZooKeeper's default. ClickHouse Keeper's documented default client port is `9181`. Updated both `nc -z clickhouse-keeper 2181` usages to `9181`. While Keeper can be configured on 2181 as a ZooKeeper drop-in replacement, the convention (and what the official ClickHouse docs and common Kubernetes operators such as the Altinity ClickHouse operator use) is 9181, so `9181` is the correct default to demonstrate in a ClickHouse-Keeper-specific tutorial.

## Review Notes
- The post correctly notes ClickHouse runs as UID 101 in the official image, and `chown -R 101:101 /var/lib/clickhouse` with `chmod 750` is accurate for initializing PVC permissions.
- `vm.max_map_count=262144` matches ClickHouse's recommended minimum. `net.core.somaxconn=65535` is a reasonable high-throughput tuning. `vm.overcommit_memory=1` is not specifically required by ClickHouse (it's common in Redis tuning) but is a defensible general setting; not a technical error.
- Subtle caveat worth a future reader's attention: `vm.*` sysctls are generally node-level (not pod-namespaced), so changes made from a privileged init container affect the host node and persist beyond the pod's lifetime. The post's phrasing "settings persist for the lifetime of the pod" is slightly imprecise but not misleading enough to warrant a rewrite.
- The Vault CLI syntax (`vault kv get -field=users.xml secret/clickhouse`) is valid for the Vault KV v1 engine; for KV v2, the path would typically need `secret/data/clickhouse` unless the CLI is configured with KV v2 defaults. This is fine for an illustrative example.
