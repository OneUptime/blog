# Validation Summary: How to Configure Transparent Huge Pages for Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / sysadmin configuration guide

## Technologies Covered
- Ubuntu / Linux
- Linux kernel Transparent Huge Pages (THP)
- sysfs THP controls
- systemd service units
- GRUB kernel command-line parameters
- perf
- Redis
- MongoDB
- MySQL / MariaDB
- PostgreSQL
- Java JVM large page options

## Sources Consulted
- Linux kernel Transparent Hugepage Support documentation: https://docs.kernel.org/admin-guide/mm/transhuge.html
- Linux kernel v6.7 Transparent Hugepage Support documentation: https://kernel.org/doc/html/v6.7/admin-guide/mm/transhuge.html
- Linux man-pages for `mmap(2)` and `MAP_HUGETLB`: https://www.man7.org/linux/man-pages/man2/mmap.2.html
- Linux man-pages for `shmget(2)` and `SHM_HUGETLB`: https://www.man7.org/linux/man-pages/man2/shmget.2.html
- Redis latency documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- MongoDB THP disable guidance for MongoDB 7.0 and earlier / self-managed deployments: https://www.mongodb.com/docs/v8.0/tutorial/disable-transparent-huge-pages/
- MongoDB 8.0+ TCMalloc / THP guidance: https://www.mongodb.com/docs/manual/administration/tcmalloc-performance/
- PostgreSQL resource consumption and huge pages documentation: https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL 16 Linux huge pages documentation: https://www.postgresql.org/docs/16/kernel-resources.html
- Oracle JDK `java` command documentation for `-XX:+UseTransparentHugePages`: https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html
- MySQL large page support documentation: https://dev.mysql.com/doc/refman/8.4/en/large-page-support.html

## Issues Found
- Corrected the explicit huge pages syscall flags. `MAP_HUGETLB` applies to `mmap()`, while System V shared memory uses `SHM_HUGETLB` with `shmget()`.
- Clarified that the documented `always`, `madvise`, and `never` values are the top-level anonymous THP control modes, and that newer kernels can still allow `MADV_COLLAPSE` even when sysfs controls are set to `never`.
- Updated MongoDB guidance. MongoDB documentation recommends disabling THP for MongoDB 7.0 and earlier, while MongoDB 8.0 and later has upgraded TCMalloc guidance that can enable THP.
- Removed the inaccurate claim that PostgreSQL 16+ properly uses `madvise` for THP. PostgreSQL documentation currently discourages transparent huge pages and points users toward explicit huge pages.
- Replaced the broad Java 14+ claim with documented JVM behavior: `-XX:+UseTransparentHugePages` is an opt-in JVM flag and should be benchmarked.
- Corrected the persistence section heading and wording. THP sysfs settings are not sysctl-managed, so the example is a startup script/systemd-style persistence approach rather than sysctl configuration.
- Adjusted the workload recommendation table to reflect the corrected MongoDB, MySQL/MariaDB, PostgreSQL, and Java guidance.

## Review Notes
The shell commands and systemd unit syntax are generally valid for Ubuntu systems using systemd. Some newer kernels expose additional per-size THP controls under `/sys/kernel/mm/transparent_hugepage/hugepages-<size>kB/`; the post remains focused on the common top-level controls used on Ubuntu, but a future update could add a short note about multi-size THP.
