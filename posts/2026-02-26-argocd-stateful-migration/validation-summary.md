# Validation Summary: How to Handle Stateful Migration with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD sync hooks and sync waves
- Kubernetes PersistentVolumes, PersistentVolumeClaims, Jobs, Deployments, and StatefulSets
- Kubernetes StorageClasses and reclaim policies
- PostgreSQL 16 physical data handling and verification queries
- Velero Backup and Restore custom resources
- GitOps migration workflow

## Sources Consulted
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes API reference for StatefulSet: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/#statefulset-v1-apps
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- PostgreSQL 16 CHECKPOINT: https://www.postgresql.org/docs/16/sql-checkpoint.html
- PostgreSQL 16 system administration functions: https://www.postgresql.org/docs/16/functions-admin.html
- PostgreSQL 16 monitoring statistics: https://www.postgresql.org/docs/16/monitoring-stats.html
- PostgreSQL 16 psql: https://www.postgresql.org/docs/16/app-psql.html
- Velero Backup API type: https://velero.io/docs/v1.17/api-types/backup/
- Velero Restore API type: https://velero.io/docs/v1.17/api-types/restore/

## Issues Found
- The database quiescence example stopped application writers but left PostgreSQL running while the post later performed a physical file copy of the data directory. A checkpoint alone does not make copying live PostgreSQL files safe. Updated the text and hook example to install the required clients, checkpoint PostgreSQL, scale the PostgreSQL StatefulSet to zero, and wait for its pod to terminate before the copy hook runs.
- The quiescence hook used a kubectl-only image while invoking `psql`, which would fail unless a PostgreSQL client was also present. Changed the image to Alpine and added installation of `kubectl` and `postgresql16-client`.
- The verification example labeled `n_tup_ins` as a table count. That column is a cumulative insert counter from PostgreSQL statistics, not a row count. Changed the query to review `n_live_tup` row-count estimates and kept the exact count checks for important tables.

## Review Notes
- The examples are still migration patterns, not complete production manifests. In a real cluster, the `migration-sa` service account needs RBAC permissions for the referenced Deployments, StatefulSets, Pods, Jobs, PVCs, and namespaces.
- For near-zero-downtime PostgreSQL migrations, logical replication, `pg_dump`/restore, `pg_basebackup`, CSI snapshots, or storage-native replication are usually safer than an offline file copy. The post's corrected example now treats the file copy as an offline physical copy.
- The StatefulSet `volumes` example is valid for a single replica, but multi-replica StatefulSets usually need per-pod PVCs from `volumeClaimTemplates`.
