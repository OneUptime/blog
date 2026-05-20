# Validation Summary: How to Handle Stateful Applications with GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes StatefulSets
- PersistentVolumeClaims and StorageClasses
- PostgreSQL
- CloudNativePG
- Strimzi Kafka Operator
- Kubernetes Jobs and CronJobs
- Velero and object storage backups

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes PersistentVolume and PVC expansion documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD resource exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- CloudNativePG backup on object stores documentation: https://cloudnative-pg.io/docs/1.29/appendixes/backup_barmanobjectstore/
- CloudNativePG API reference: https://cloudnative-pg.io/docs/1.29/cloudnative-pg.v1/
- Strimzi deployment documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi downloads and supported versions: https://strimzi.io/downloads/
- Strimzi custom resource API reference: https://strimzi.io/docs/operators/latest/configuring

## Issues Found
- The raw PostgreSQL StatefulSet used `replicas: 3` with the stock `postgres` image but no replication/bootstrap configuration. That would create independent PostgreSQL pods rather than a working replicated cluster, so the example was changed to `replicas: 1`.
- The Argo CD sync options described `PrunePropagationPolicy=orphan` as preventing deletion. Argo CD documents `Prune=false` for preventing pruning and `Delete=false` for retaining resources on application deletion, so the Application example was updated to use those options.
- The resource exclusions section implied PVCs would only be protected from pruning. Argo CD resource exclusions remove resources from discovery and sync, so the wording was corrected to explain that Argo CD will not manage or prune excluded PVCs.
- The Strimzi example used the older ZooKeeper-based Kafka configuration with `apiVersion: kafka.strimzi.io/v1beta2` and Kafka 3.7. Current Strimzi 1.0 uses `kafka.strimzi.io/v1`, KRaft mode, and `KafkaNodePool` resources; the snippet was updated accordingly.
- The pre-upgrade PostgreSQL backup Job used `pg_dumpall` without providing `PGPASSWORD`, which would fail in non-interactive execution. The missing secret-backed environment variable was added.
- The storage resizing section recommended changing a StatefulSet `volumeClaimTemplates` entry for existing volumes. Kubernetes PVC expansion is performed on PVC objects, and StatefulSet claim templates are not the right target for resizing existing claims, so the example now resizes the generated PVC.
- The PostgreSQL backup CronJob used the stock `postgres` image while running `aws s3 cp`; that image does not provide the AWS CLI. The example now calls out that the image must contain both PostgreSQL client tools and the AWS CLI and uses a clearly custom placeholder image.

## Review Notes
- YAML snippets were syntax-checked after editing.
- The CloudNativePG example is valid for the documented in-tree Barman object store configuration, but CloudNativePG now also recommends the dedicated Barman Cloud Plugin for newer deployments.
- The PVC deletion risk depends on how PVCs are represented and tracked. StatefulSet-created PVCs default to retained by Kubernetes, while standalone PVC manifests managed by Argo CD can still be pruned or deleted if not protected.
