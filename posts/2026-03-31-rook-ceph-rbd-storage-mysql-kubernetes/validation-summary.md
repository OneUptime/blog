# Validation Summary: How to Set Up Ceph RBD Storage for MySQL on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage)
- Kubernetes (StatefulSet, StorageClass, ConfigMap, PVC)
- MySQL 8.0 (InnoDB configuration)
- Ceph RGW (S3-compatible object storage for backups)
- AWS CLI (for S3 uploads)

## Sources Consulted
- Ceph RADOS architecture documentation — atomicity guarantees are at the single-object level, not the block device level
- MySQL 8.0 Reference Manual — InnoDB configuration variables, doublewrite buffer documentation
- MySQL 8.0.30 Release Notes — deprecation of `innodb_log_file_size` and `innodb_log_files_in_group` in favor of `innodb_redo_log_capacity`
- Rook-Ceph documentation — StorageClass parameters for CSI RBD provisioner
- Docker Hub mysql:8.0 image — base image contents (does not include AWS CLI)

## Issues Found

1. **Incorrect recommendation to disable InnoDB doublewrite buffer**: The post claimed "RBD is atomic at the block level" and recommended setting `innodb_doublewrite = OFF`. This is incorrect. Ceph RADOS provides atomicity at the single-object level (default 4MB objects), not at the block device level. A 16KB InnoDB page write is not guaranteed to be atomic through the RBD layer — writes could theoretically span RADOS object boundaries, and no official Ceph documentation guarantees atomic block writes at the InnoDB page size. Disabling the doublewrite buffer risks torn pages and silent data corruption on crash. **Fix:** Removed `innodb_doublewrite = OFF` from both the ini configuration block and removed the associated comment. Updated the summary paragraph to correctly state that doublewrite should remain enabled.

2. **Deprecated `innodb_log_file_size` parameter**: The post used `innodb_log_file_size = 512M`, which was deprecated in MySQL 8.0.30 in favor of `innodb_redo_log_capacity`. Since `mysql:8.0` resolves to the latest 8.0.x patch (well past 8.0.30), this generates deprecation warnings. **Fix:** Replaced `innodb_log_file_size = 512M` with `innodb_redo_log_capacity = 1G` (equivalent capacity: the old default was 2 log files × 512M = 1G) in both the ini block and the ConfigMap.

3. **ConfigMap inconsistent with ini configuration block**: The ConfigMap was missing `innodb_io_capacity_max = 4000` which was present in the ini configuration block shown earlier in the post. **Fix:** Added `innodb_io_capacity_max = 4000` to the ConfigMap to make it consistent.

## Review Notes
- The backup command (`mysqldump` piped to `aws s3 cp`) assumes the AWS CLI is available inside the `mysql:8.0` container. The standard `mysql:8.0` Docker image does not include the AWS CLI, so this command would fail as written. Users would need a custom image or a separate Job/CronJob with aws-cli installed. This is a common tutorial simplification but worth noting.
- The Ceph pool creation commands use `ceph osd pool create mysql-pool 64 64` with explicit PG counts. In newer Ceph releases (Nautilus+), the `pg_autoscaler` module is enabled by default and may override manual PG settings. This is not incorrect but worth being aware of.
- The StorageClass, StatefulSet structure, liveness probe configuration, and overall architecture are all correct and follow best practices.
