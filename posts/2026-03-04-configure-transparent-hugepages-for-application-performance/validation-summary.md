# Validation Summary: How to Configure Transparent Hugepages for Application Performance on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux Transparent Huge Pages
- Linux HugeTLB/static huge pages
- Linux sysfs memory tuning
- systemd tmpfiles
- grubby kernel command-line configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring huge pages" and "Managing transparent hugepages": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- Linux kernel documentation, "Transparent Hugepage Support": https://www.kernel.org/doc/html/v6.7/admin-guide/mm/transhuge.html
- Linux kernel documentation, current "Transparent Hugepage Support": https://www.kernel.org/doc/html/v6.12/admin-guide/mm/transhuge.html
- systemd tmpfiles.d manual: https://www.freedesktop.org/software/systemd/man/tmpfiles.d.html
- Redis documentation, "Diagnosing latency issues": https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- MongoDB documentation, "TCMalloc Performance Optimization for a Self-Managed Deployment": https://www.mongodb.com/docs/manual/tutorial/transparent-huge-pages/
- MongoDB documentation, "Production Notes for Self-Managed Deployments": https://www.mongodb.com/docs/manual/administration/production-notes/
- Oracle Database documentation, "Disabling Transparent HugePages": https://docs.oracle.com/en/database/oracle/oracle-database/21/cwlin/disabling-transparent-hugepages.html

## Issues Found
- The database examples said "MongoDB" generally recommends disabling THP. This is outdated for MongoDB 8.0 and later, where MongoDB recommends enabling THP with the upgraded TCMalloc on supported platforms. I changed the example to "MongoDB 7.0 or earlier" to match current MongoDB documentation.

## Review Notes
- The RHEL runtime commands for `/sys/kernel/mm/transparent_hugepage/enabled` are correct, and Red Hat documents `always`, `never`, and `madvise` as supported settings.
- The `transparent_hugepage=madvise` kernel command-line parameter is valid; Red Hat examples commonly use `--update-kernel=DEFAULT`, while the post's `--update-kernel=ALL` form is a valid grubby pattern for applying the argument to all boot entries.
- The `defrag` values listed in the post match Linux kernel documentation. The brief descriptions are high-level, but technically consistent with the kernel behavior.
- The tmpfiles.d `w` lines use the documented format for writing an argument to an existing file, which is appropriate for sysfs paths that already exist at boot.
