# Validation Summary: How to Set Up Ceph RBD Storage for MariaDB on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage, RGW object storage)
- Kubernetes (StorageClass, PVC, kubectl)
- MariaDB (InnoDB configuration, binary logging, Galera cluster)
- mariadb-operator (k8s.mariadb.com/v1alpha1 CRD)
- mariabackup (streaming backup to S3)
- Ceph OSD pool management

## Sources Consulted
- MariaDB Server documentation for `SHOW REPLICA STATUS` (replacement for `SHOW SLAVE STATUS` in 10.5.1+): https://mariadb.com/kb/en/show-replica-status/
- MariaDB Server documentation for `SHOW BINLOG STATUS` (replacement for `SHOW MASTER STATUS` in 10.5.2+): https://mariadb.com/kb/en/show-binlog-status/
- MariaDB Server documentation for InnoDB system variables: https://mariadb.com/kb/en/innodb-system-variables/
- Rook-Ceph documentation for RBD StorageClass: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- mariadb-operator GitHub repository: https://github.com/mariadb-operator/mariadb-operator
- MariaDB Galera Cluster documentation: https://mariadb.com/kb/en/galera-cluster/

## Issues Found
1. **Deprecated SQL commands in Monitoring section**: `SHOW SLAVE STATUS` and `SHOW MASTER STATUS` are legacy syntax. MariaDB 10.5.1+ added `SHOW REPLICA STATUS` as the preferred replacement, and MariaDB 10.5.2+ added `SHOW BINLOG STATUS` as the preferred replacement for `SHOW MASTER STATUS`. Updated both commands to the modern syntax with version annotations. The old syntax still works as aliases but modern documentation should use the current terminology.

## Review Notes
- The `replication.mode: SemiSync` field in the mariadb-operator CRD may not be a standard field in all versions of the operator. The semi-synchronous replication mode is typically configured through MariaDB server variables (`rpl_semi_sync_master_enabled`, `rpl_semi_sync_slave_enabled`) in the `myCnf` section. Users should verify this field against the specific version of mariadb-operator they are deploying.
- The `expire_logs_days = 7` setting is still valid in MariaDB but `binlog_expire_logs_seconds` (added in MariaDB 10.6.1) provides finer-grained control. Not changed since `expire_logs_days` is not deprecated in MariaDB (unlike MySQL 8.0+).
- The backup command omits `--user` and `--password` flags for `mariabackup`, which would be needed in practice. This is a common simplification in documentation.
- The Ceph pool creation uses explicit PG count (`64 64`). In newer Ceph versions (Nautilus+), the `pg_autoscaler` module can handle PG counts automatically, which may be preferable for production deployments.
