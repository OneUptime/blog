# Validation Summary: How to Optimize Database Storage Performance on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS and ext4 file systems
- Linux block I/O schedulers and queue sysfs settings
- Linux kernel sysctl tuning
- TuneD
- Transparent Huge Pages
- SSD TRIM with fstrim
- PostgreSQL
- MySQL and MariaDB InnoDB

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Creating an XFS file system, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_creating-an-xfs-file-system_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Setting the disk scheduler, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-the-disk-scheduler_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Configuring huge pages and Transparent Huge Pages, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- PostgreSQL documentation: Resource Consumption, https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL documentation: Query Planning, https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL documentation: Write Ahead Log and checkpoints, https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL documentation: Managing Kernel Resources, https://www.postgresql.org/docs/current/kernel-resources.html
- MySQL 8.4 Reference Manual: Optimizing InnoDB Disk I/O, https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-diskio.html
- MySQL 8.4 Reference Manual: InnoDB Startup Options and System Variables, https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html
- MySQL 8.4 Reference Manual: Configuring InnoDB I/O Capacity, https://dev.mysql.com/doc/refman/8.4/en/innodb-configuring-io-capacity.html
- MySQL 9.0 Reference Manual: Configuring InnoDB background I/O threads, https://dev.mysql.com/doc/refman/9.0/en/innodb-performance-multiple_io_threads.html
- Linux man-pages: mount(8), https://man7.org/linux/man-pages/man8/mount.8.html
- Linux kernel documentation: Queue sysfs files, https://www.kernel.org/doc/html/v5.15/block/queue-sysfs.html
- Local command output for `mkfs.ext4`, `iostat --help`, and current `sysctl` keys.

## Issues Found
- The XFS `lazy-count=1` explanation implied a non-default tuning change. I changed the wording to say it keeps the default lazy superblock counter behavior, because this option is already enabled by default on modern XFS.
- The XFS mount example included `nodiratime` with `noatime`. I removed `nodiratime` because it is redundant when `noatime` is set.
- The XFS mount example included `logbufs=8` and described it as increasing XFS log buffers. I removed it because modern XFS already defaults to 8 log buffers, so the option does not increase anything.
- The sysctl example set `kernel.shmmax`, `kernel.shmall`, and `fs.file-max` to fixed values. On modern RHEL 9-style kernels these defaults are usually already much higher, and setting them as shown can lower limits rather than increase them. I removed those fixed values.

## Review Notes
- The remaining performance values are workload-dependent starting points, not universal best settings. Benchmark on the target hardware before applying them broadly.
- The I/O scheduler guidance matches Red Hat's RHEL 9 baseline recommendations: `none` for high-performance SSD/NVMe storage and `mq-deadline` or `bfq` for traditional HDDs.
- PostgreSQL and MySQL configuration examples use valid parameter names, but exact values should be tuned per database version, storage latency, cache hit rate, and workload.
