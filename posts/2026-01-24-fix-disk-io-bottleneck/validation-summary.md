# Validation Summary: How to Fix 'Disk I/O Bottleneck' Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux disk I/O monitoring and block device tuning
- iostat, iotop, blktrace, blkparse, btt
- PostgreSQL and pg_stat_statements
- SQLAlchemy and PostgreSQL COPY
- Redis caching
- ext4, XFS, fstab mount options
- Linux VM dirty page sysctl settings
- mdadm RAID
- Kubernetes StorageClass and PersistentVolumeClaim
- AWS EBS CSI Driver
- Prometheus Node Exporter alerting

## Sources Consulted
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- SQLAlchemy engine and connection documentation: https://docs.sqlalchemy.org/en/21/core/connections.html
- Linux iostat manual page: https://man7.org/linux/man-pages/man1/iostat.1.html
- Linux blkparse manual page: https://man7.org/linux/man-pages/man1/blkparse.1.html
- Linux btt manual page: https://man7.org/linux/man-pages/man1/btt.1.html
- Linux kernel queue sysfs documentation: https://www.kernel.org/doc/html/v5.3/block/queue-sysfs.html
- Linux kernel VM sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- AWS EBS CSI Driver parameters documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The PostgreSQL query used `total_time`, which is not the current pg_stat_statements execution-time column. Changed it to `total_exec_time`.
- The iostat guidance treated `%util > 80%` as a definitive saturation signal and referenced only `avgqu-sz`. Updated the wording to note that `%util` is most reliable for serial devices and changed the queue metric to current `aqu-sz`, with `avgqu-sz` noted for older iostat versions.
- The diagnostic script labeled `/proc/diskstats` as "Pending I/O"; that file contains raw disk statistics rather than a simple pending I/O count. Renamed the label to "Raw Disk Statistics".
- The SQLAlchemy COPY example used `engine.raw_connection()` as a context manager. Reworked it to explicitly close the raw DBAPI connection in a `finally` block.
- The Python batching comments said individual and batched commits map to one I/O per row or one I/O for all rows. Changed this to transaction-based wording, which is the accurate distinction.
- The read-ahead section said `/sys/block/.../read_ahead_kb` is in 512-byte sectors. Corrected it to KB.
- The VM dirty page section referred to `pdflush`; current kernel documentation describes kernel flusher threads. Updated the comment.
- The Kubernetes StorageClass examples used the removed/deprecated in-tree AWS EBS provisioner and an outdated IOPS parameter. Updated them to `ebs.csi.aws.com` and `iops`.

## Review Notes
Some threshold values, such as target disk latency and dirty page ratios, remain workload-dependent heuristics. The post now avoids presenting the most version-sensitive ones as universal rules where the official documentation has important caveats.
