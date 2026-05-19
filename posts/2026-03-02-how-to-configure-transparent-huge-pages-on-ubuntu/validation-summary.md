# Validation Summary: How to Configure Transparent Huge Pages on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel Transparent Huge Pages (THP)
- systemd services
- GRUB kernel parameters
- perf
- PostgreSQL
- MongoDB
- Redis
- Oracle Database
- Java JVM options

## Sources Consulted
- Linux kernel Transparent Hugepage Support documentation: https://docs.kernel.org/admin-guide/mm/transhuge.html
- MongoDB Disable Transparent Hugepages documentation: https://www.mongodb.com/docs/manual/tutorial/disable-transparent-huge-pages/
- Redis latency troubleshooting documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- PostgreSQL resource consumption documentation: https://www.postgresql.org/docs/current/runtime-config-resource.html
- Oracle Database Linux administration documentation: https://docs.oracle.com/en/database/oracle/oracle-database/19/unxar/administering-oracle-database-on-linux.html
- Oracle Java command documentation: https://docs.oracle.com/en/java/javase/23/docs/specs/man/java.html
- Local Ubuntu kernel/sysfs and command help output for THP settings, systemd, update-grub, and perf.

## Issues Found
- The post described THP as always using 2MB pages. Updated this to explain that 2MB is the traditional PMD-sized THP on typical x86_64 systems, while modern kernels can support additional THP sizes.
- The post said `always` is the Ubuntu default. Updated this because Ubuntu defaults vary by release, kernel flavor, and boot parameters; current Ubuntu generic kernels commonly use `madvise`.
- The post said `never` completely disables THP. Updated this with the current kernel caveat that `madvise(MADV_COLLAPSE)` can still explicitly request collapse on newer kernels.
- The database recommendation for MongoDB was too broad. Updated MongoDB references to apply to MongoDB 7.0 or earlier because MongoDB 8.0 documentation changed its THP guidance.
- The summary table included MySQL under the same `never` recommendation, but the official MySQL documentation focuses on explicit HugeTLB large page support rather than a blanket THP disable recommendation. Removed MySQL from that row.
- The post said high `compact_stall` values confirm THP defragmentation is causing latency. Updated this to the more accurate statement that they indicate synchronous memory compaction and may contribute to latency.

## Review Notes
The commands and configuration snippets are generally valid for Ubuntu systems with the standard `/sys/kernel/mm/transparent_hugepage` interface. Some `perf` TLB event names are hardware-dependent, so users may need `perf list` on their specific CPU if an event is unavailable.
