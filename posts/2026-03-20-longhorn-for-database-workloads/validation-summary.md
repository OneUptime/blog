# Validation Summary: How to Set Up Longhorn for Database Workloads - For

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Kubernetes StorageClass and PersistentVolumeClaim workflows
- PostgreSQL
- MySQL
- XFS

## Sources Consulted
- Longhorn Storage Class Parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn Recurring Snapshots and Backups: https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots
- Longhorn Setting a Backup Target: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Concepts: https://longhorn.io/docs/latest/concepts/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- PostgreSQL Docker Official Image docs: https://github.com/docker-library/docs/blob/master/postgres/README.md
- PostgreSQL documentation for `synchronous_commit`: https://www.postgresql.org/docs/current/wal-async-commit.html
- MySQL Docker Official Image docs: https://github.com/docker-library/docs/blob/master/mysql/README.md
- MySQL 8.0 InnoDB startup options and system variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html

## Issues Found
- The original latency recommendation suggested `best-effort` or `strict-local` data locality alongside a 3-replica design. Longhorn documents that `strict-local` requires a replica count of 1, so I corrected the guidance to recommend `best-effort` for replicated volumes.
- The PostgreSQL example mounted a second PVC for WAL files but never instructed the official `postgres` image to use it. I added `POSTGRES_INITDB_WALDIR` and updated the init container to set permissions on both the data and WAL volumes so the WAL PVC is actually used.
- The recurring-backup example attempted to find Longhorn volumes by a `workload=database` label that was never applied to those volumes. I replaced that with the supported PVC-label workflow from Longhorn, including `recurring-job.longhorn.io/source=enabled`, so the recurring jobs are synchronized to the database volumes.
- The MySQL section referenced a `mysql-secret` but did not create it or show the apply command for the StatefulSet. I added the secret-creation and deployment commands required for the example to start successfully.
- The backup section implied backups would run immediately without noting the required Longhorn backup target. I added a prerequisite comment so the backup job example matches Longhorn’s documented behavior.

## Review Notes
- The PostgreSQL WAL relocation only affects initial database initialization because `POSTGRES_INITDB_WALDIR` is consumed by `initdb`. For an already-initialized cluster, changing this later will not move existing WAL files.
- The examples focus on storage configuration and StatefulSets. Production deployments will still need the usual networking, monitoring, and database-level backup validation that sit outside Longhorn storage setup itself.
