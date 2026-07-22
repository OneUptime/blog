# Validation Summary: How to Make CSI Snapshots Application-Consistent for PostgreSQL, MySQL, and MongoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Container Storage Interface (CSI)
- `VolumeSnapshot` and `VolumeGroupSnapshot`
- PostgreSQL 18
- MySQL 8.4
- MongoDB 8.0 with WiredTiger
- Velero 1.18 backup hooks

## Sources Consulted
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes 1.36: Moving Volume Group Snapshots to GA](https://kubernetes.io/blog/2026/05/08/kubernetes-v1-36-volume-group-snapshot-ga/)
- [PostgreSQL 18: File System Level Backup](https://www.postgresql.org/docs/current/backup-file.html)
- [PostgreSQL 18: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [MySQL 8.4: Database Backup Methods](https://dev.mysql.com/doc/refman/8.4/en/backup-methods.html)
- [MySQL 8.4: `FLUSH` Statement](https://dev.mysql.com/doc/refman/8.4/en/flush.html#flush-tables-with-read-lock)
- [MySQL 8.4: `LOCK TABLES` and `UNLOCK TABLES` Statements](https://dev.mysql.com/doc/refman/8.4/en/lock-tables.html)
- [MySQL 8.4: Establishing a Backup Policy](https://dev.mysql.com/doc/refman/8.4/en/backup-policy.html)
- [MongoDB 8.0: Back Up a Self-Managed Deployment with Filesystem Snapshots](https://www.mongodb.com/docs/v8.0/tutorial/backup-with-filesystem-snapshots/)
- [MongoDB 8.0: Back Up a Sharded Cluster with File System Snapshots](https://www.mongodb.com/docs/v8.0/tutorial/backup-sharded-cluster-with-filesystem-snapshots/)
- [Velero 1.18: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)

## Issues Found
- The introduction implied that all required volumes always need an exactly simultaneous capture. Clarified that exact simultaneity is required when writes remain possible, while sequential snapshots are valid if the database stays stopped or fully quiesced for the entire capture interval. This matches the Kubernetes 1.36 volume group snapshot guidance and PostgreSQL's filesystem-backup guidance.
- The MySQL section suggested `mysqldump --single-transaction` for workloads that are only primarily InnoDB. Clarified that its consistency guarantee applies to transactional tables and that nontransactional tables must remain unchanged during the dump.
- The MongoDB sharded-cluster section could be read as requiring a vendor backup product. Clarified that MongoDB's documented manual filesystem-snapshot procedure is also supported when the balancer, writes, and schema transformations are stopped before all cluster components are captured.
- The Velero checklist implied that a post hook could cover every failure path. Corrected it to describe normal post-hook cleanup after the backed-up item block; the existing watchdog requirement covers abandoned locks when a post hook cannot run or fails.

## Review Notes
- The Kubernetes snapshot and group-snapshot APIs are CRDs rather than core API objects. The cluster distribution must install the CRDs and snapshot controller, and the CSI driver must implement the applicable snapshot capabilities.
- The PostgreSQL online frozen-snapshot procedure is intentionally a crash-recovery image: WAL replay is expected on restore. It should not be confused with a clean-shutdown image.
- The MySQL global read lock is session-scoped. A short-lived `mysql -e` process releases the lock when its connection closes, so the post's coordinator requirement is correct.
- Velero exec hooks are not run through a shell by default, and hook timeout or failure handling must be designed so an external watchdog can release an abandoned database or filesystem lock.
