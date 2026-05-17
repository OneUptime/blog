# Validation Summary: How to Set Up LVM During Ubuntu Server Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LVM2 (Logical Volume Manager)
- Ubuntu Server installer (Subiquity)
- ext4 and XFS filesystems
- LVM snapshots and thin provisioning
- PostgreSQL backup integration
- util-linux tools (mount, findmnt)

## Sources Consulted
- LVM2 manpages: lvcreate(8), lvextend(8), lvreduce(8), lvs(8), vgs(8), pvs(8), pvmove(8), vgextend(8), vgreduce(8), pvremove(8), lvchange(8), vgchange(8), vgscan(8)
- Red Hat LVM Administrator Guide: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/
- Ubuntu Server Guide - Device Mapper / LVM: https://ubuntu.com/server/docs/device-mapper
- resize2fs(8) and xfs_growfs(8) manpages
- PostgreSQL 15 release notes (function renames): https://www.postgresql.org/docs/15/release-15.html
- PostgreSQL backup functions documentation: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-BACKUP
- Docker storage driver documentation (devicemapper deprecation): https://docs.docker.com/storage/storagedriver/device-mapper-driver/

## Issues Found

1. **PostgreSQL backup function names were deprecated/removed.** The post used `pg_start_backup()` and `pg_stop_backup()`, which were renamed in PostgreSQL 15 (released October 2022) to `pg_backup_start()` and `pg_backup_stop()`. The original names were removed entirely in PG 15+. Updated the example to use the current function names and added a "(PostgreSQL 15+)" annotation.

2. **Docker `devicemapper` storage driver claim was outdated.** The post stated "Thin provisioning is used heavily by Docker (dm storage driver) and KVM" in present tense. The `devicemapper` storage driver was deprecated in Docker 18.09 (November 2018) and removed in Docker 25.0 (early 2024); `overlay2` is the current recommended driver. Updated the sentence to mention KVM and container runtimes generally, and added a parenthetical note about the Docker deprecation pointing users to `overlay2`.

## Review Notes
- LVM commands, flags, and syntax (lvcreate, lvextend, lvreduce, lvs, vgs, pvs, pvmove, vgextend, vgreduce, pvremove, lvchange, vgchange) are all correct and current.
- The `lvextend -r` / `--resizefs` flag could be mentioned as a shortcut to combine `lvextend` and `resize2fs`/`xfs_growfs` in one command, but the explicit two-step approach in the post is also valid and arguably more educational.
- The claim that "by default, `ubuntu-lv` uses 100% of the VG" is debatable for current Subiquity-based installers (which often reserve part of the VG by default), but behavior has varied across Ubuntu releases and the surrounding advice to verify and leave free space is sound regardless. Left as-is.
- The PostgreSQL example uses the legacy "exclusive" low-level backup API (now `pg_backup_start`/`pg_backup_stop`). For modern production workloads, tools like `pg_basebackup` or `pgBackRest` are generally preferred, but the example is technically correct as a demonstration of LVM snapshot integration.
- Snapshot, thin provisioning, and troubleshooting sections are all accurate.
- LVM extent size description ("usually 4 MB chunks") is colloquially correct (the default is 4 MiB).
