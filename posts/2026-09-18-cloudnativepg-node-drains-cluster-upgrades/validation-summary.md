# Validation Summary: Keep PostgreSQL Operator Pods Available During Node Drains and Cluster Upgrades

## Status

validated

## Post Type

Technical operations guide with shell commands and a CloudNativePG Cluster configuration fragment.

## Technologies Covered

- CloudNativePG 1.30 and its kubectl plugin
- PostgreSQL streaming replication, synchronous replication, and primary switchovers
- Kubernetes node maintenance, eviction, and PodDisruptionBudgets
- PersistentVolumeClaims, local PersistentVolumes, and storage topology
- Kubernetes Services and EndpointSlices

## Sources Consulted

- [CloudNativePG 1.30 Kubernetes upgrade and maintenance](https://cloudnative-pg.io/docs/1.30/kubernetes_upgrade/) — primary switchovers, replica disruption protection, single-instance drains, enablePDB, and legacy maintenance behavior. Also read the [official release-1.30 documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/kubernetes_upgrade.md).
- [CloudNativePG 1.30 API source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/api/v1/cluster_types.go) — instances, enablePDB, maintenance fields, affinity, and the Ready condition.
- [CloudNativePG 1.30 kubectl plugin documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/kubectl-plugin.md) — status and --verbose.
- [CloudNativePG 1.30 troubleshooting documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/troubleshooting.md) — Pod selectors, placement inspection, and waiting for Cluster readiness.
- [CloudNativePG 1.30 replication documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/replication.md) — synchronous acknowledgements and write availability.
- [CloudNativePG 1.30 instance manager documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/instance_manager.md) — old-primary shutdown before promotion and connection interruption.
- [CloudNativePG 1.30 service management documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/service_management.md) — the app-db-rw naming convention and primary routing.
- [CloudNativePG 1.30 labels documentation source](https://github.com/cloudnative-pg/cloudnative-pg/blob/release-1.30/docs/src/labels_annotations.md) — cnpg.io/cluster.
- [CloudNativePG 1.30 installation and upgrades](https://cloudnative-pg.io/docs/1.30/installation_upgrade/) — release-specific upgrade considerations.
- [Kubernetes kubectl drain reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/) — eviction, controller checks, --force, --ignore-daemonsets, --delete-emptydir-data, --disable-eviction, --timeout, and uncordon.
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — namespace, label selectors, wide output, label columns, and watch behavior.
- [Kubernetes kubectl wait reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/) — Ready condition and timeout syntax.
- [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/) — PDB coverage and direct-deletion limitations.
- [Kubernetes storage classes: volume binding mode](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode) — storage topology and scheduling constraints.
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/) — service-name label and endpoint readiness.

## Issues Found

1. **Switchover prerequisite needed clarification.** The introduction said another instance must be ready to serve writes before the current primary leaves. Changed this to require a healthy standby available for promotion before removal. CloudNativePG shuts down PostgreSQL on the former primary before promoting the replacement; a standby does not already serve writes during that interval.
2. **The monitoring block did not continuously follow all three resources as instructed.** The first two commands use blocking watches, so executing the block sequentially in one terminal prevents the later commands from starting. The EndpointSlice command also lacked a watch flag. Changed the instruction to use separate terminals and added -w to the EndpointSlice command.

## Review Notes

- Confirmed the stated CloudNativePG 1.30 behavior: primary protection and coordinated switchover, single-instance drain blocking with budgets enabled, and one-at-a-time graceful replica removal for clusters with at least three instances.
- The YAML is explicitly a fragment of an existing Cluster, so omitted metadata, apiVersion, kind, and storage fields are appropriate. instances: 3 and enablePDB: true are valid.
- Confirmed that --force addresses controller checks and does not itself disable eviction-based PDB protection. The existing conditional guidance was retained.
- nodeMaintenanceWindow remains supported for compatibility, while direct PDB control is recommended. The post correctly avoids presenting it as the default maintenance workflow.
- The Ready wait is a valid CloudNativePG command. The subsequent replication, archiving, application, and redundancy checks remain necessary; readiness alone does not prove end-to-end recovery.
- The commands assume an installed CloudNativePG operator and cnpg kubectl plugin, suitable permissions, and resources matching the example names. Storage mobility, synchronous-replication settings, and application retry behavior require environment-specific rehearsal.
- The maintenance documentation URL returned HTTP 200 when fetched directly. The web reader could not load several versioned CloudNativePG pages, so their official release-1.30 source files were consulted instead. The Kubernetes documentation links resolved to their intended resources; the author link is a plausible GitHub profile URL.
- Validation was performed against official documentation and source definitions. No live database, drain, or Kubernetes upgrade was executed.
