# Validation Summary: How to Implement Hot Storage Backups

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Hot, warm, and cold backup storage tiers
- MySQL logical backups and binary logs
- PostgreSQL `pg_dump` and `pg_restore`
- Kubernetes Jobs, CronJobs, StorageClasses, PVCs, and Deployments
- Amazon EBS CSI driver and S3 lifecycle policies
- Redis sorted sets and metadata caching
- Linux `blockdev`, `sysctl`, and mount options
- PrometheusRule alerting and node exporter metrics
- Bash and Python scripting

## Sources Consulted
- MySQL 8.4 Reference Manual: `mysqldump` - https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- PostgreSQL current documentation: `pg_dump` - https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL current documentation: `pg_restore` - https://www.postgresql.org/docs/current/app-pgrestore.html
- Amazon EKS documentation: Amazon EBS CSI driver - https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- AWS Containers Blog: Amazon EBS CSI driver and in-tree `kubernetes.io/aws-ebs` deprecation - https://aws.amazon.com/blogs/containers/amazon-ebs-csi-driver-is-now-generally-available-in-amazon-eks-add-ons/
- Amazon EBS CSI driver parameters - https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- Amazon S3 storage classes - https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- Redis `ZRANGE` command documentation - https://redis.io/docs/latest/commands/zrange/
- redis-py command documentation - https://redis.readthedocs.io/en/stable/commands.html
- Linux `blockdev(8)` manual - https://man7.org/linux/man-pages/man8/blockdev.8.html
- Prometheus node exporter guide - https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- Replaced the MySQL `mysqldump --master-data=2` option with `--source-data=2`, because current MySQL documentation uses `--source-data` for recording binary log coordinates for point-in-time recovery.
- Fixed the Kubernetes restore Job timing example by initializing `START_TIME`, using shell arithmetic for elapsed seconds, and defining the `TEST_DB_HOST` environment variable used by the command.
- Clarified the benchmark comments so they no longer imply that raw device sequential throughput alone determines real `pg_dump` or `pg_restore` time.
- Updated the AWS EBS StorageClass provisioner from the deprecated in-tree `kubernetes.io/aws-ebs` plugin to the current EBS CSI provisioner `ebs.csi.aws.com`.
- Fixed the PostgreSQL directory-format backup script so it creates only the parent backup directory. `pg_dump --format=directory --file=...` creates the archive directory itself and requires that target directory not to already exist.
- Replaced the Redis point-in-time lookup with `zrange(..., byscore=True, desc=True, ...)`, using the correct reversed score-bound order for `ZRANGE ... REV BYSCORE`.

## Review Notes
- The S3 lifecycle example is syntactically plausible and uses valid storage class identifiers, but transitioning to infrequent or archival storage classes can trigger minimum storage duration charges depending on object age and class.
- The Prometheus IOPS alert is syntactically plausible, but in a real system it should usually be combined with backup activity context so idle storage does not alert merely because it has low I/O.
