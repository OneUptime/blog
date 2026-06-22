# Validation Summary: How to Configure High Availability with CloudNativePG

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- PostgreSQL
- Prometheus alerting
- PostgreSQL streaming and synchronous replication

## Sources Consulted
- CloudNativePG 1.29 API Reference: https://cloudnative-pg.io/docs/1.29/cloudnative-pg.v1/
- CloudNativePG 1.29 Replication: https://cloudnative-pg.io/docs/1.29/replication/
- CloudNativePG 1.29 Automated failover: https://cloudnative-pg.io/docs/1.29/failover/
- CloudNativePG 1.29 Scheduling: https://cloudnative-pg.io/docs/1.29/scheduling/
- CloudNativePG 1.29 Service management: https://cloudnative-pg.io/docs/1.29/service_management/
- CloudNativePG 1.29 Kubernetes upgrade and maintenance: https://cloudnative-pg.io/docs/1.29/kubernetes_upgrade/
- CloudNativePG 1.29 Kubectl Plugin: https://cloudnative-pg.io/docs/1.29/kubectl-plugin/
- CloudNativePG 1.29 Fencing: https://cloudnative-pg.io/docs/1.29/fencing/
- CloudNativePG 1.29 Monitoring: https://cloudnative-pg.io/docs/1.29/monitoring/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- `switchoverDelay` and `failoverDelay` were described as microsecond values. CloudNativePG documents both as seconds, so the production example and failover comments were corrected.
- Synchronous replication examples used the legacy `minSyncReplicas` and `maxSyncReplicas` fields. Replaced them with the current `.spec.postgresql.synchronous` configuration using `method`, `number`, and `dataDurability`.
- The failover example implied a direct Patroni-like maximum lag setting. Replaced it with CloudNativePG readiness probe configuration using `type: streaming` and `maximumLag`, which is the documented way to keep lagging replicas out of readiness-sensitive features.
- Pod role commands used the deprecated `role` label and an unverified `status` label. Updated commands to use `cnpg.io/instanceRole`.
- The manual switchover section included an undocumented `cnpg.io/targetPrimary` annotation path. Removed it and kept the documented `kubectl cnpg promote` command.
- The emergency demotion section used `cnpg.io/forceLegacyBackup`, which is only for backup behavior testing. Replaced it with the documented fencing annotation `cnpg.io/fencedInstances`.
- The PDB customization example incorrectly used `minSyncReplicas`. Replaced it with `.spec.enablePDB`, the documented CloudNativePG PDB toggle.
- Several Prometheus metric names and role label selectors were not present in the CloudNativePG documented default metrics. Replaced them with documented CNPG metrics, removed the unsafe no-replicas alert, and kept sample-style alert expressions.
- Updated wording that described three instances as required for "quorum-based decisions"; the post now frames three instances as a stronger HA and maintenance recommendation unless quorum failover is explicitly configured.

## Review Notes
The post is technically relevant and has been validated after corrections. Some examples still use environment-specific placeholders such as storage classes, node names, and image tags; those are acceptable as illustrative values but should be adjusted by operators for their own clusters.
