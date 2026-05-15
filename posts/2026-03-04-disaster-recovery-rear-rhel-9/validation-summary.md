# Validation Summary: How to Set Up Disaster Recovery with ReaR on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Relax-and-Recover (ReaR)
- NETFS backups
- ISO and USB recovery media
- NFS backup targets
- cron scheduling

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: "Recovering and restoring a system" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Relax-and-Recover User Guide: "Basic configuration" - https://relax-and-recover.org/rear-user-guide/basics/configuration.html
- Relax-and-Recover User Guide: "Example of BACKUP=NETFS" - https://relax-and-recover.org/rear-user-guide/basics/backup_netfs.html
- Relax-and-Recover usage scenarios - https://relax-and-recover.org/usage/
- ReaR man page for commands and options - https://manpages.debian.org/testing/rear/rear.8
- Red Hat blog: "ReaR: Backup and recover your Linux server with confidence" - https://www.redhat.com/en/blog/rear-backup-and-recover

## Issues Found
- `NETFS_KEEP_OLD_BACKUP_COPY=3` was incorrect. ReaR treats `NETFS_KEEP_OLD_BACKUP_COPY` as a boolean setting to keep the previous backup copy, not as a numeric retention count. Changed it to `NETFS_KEEP_OLD_BACKUP_COPY=y` and updated the comment.
- `BACKUP_PROG_EXCLUDE=(...)` replaced ReaR's default exclude patterns. Red Hat and upstream ReaR guidance recommend appending custom excludes so the defaults are preserved. Changed it to `BACKUP_PROG_EXCLUDE+=(...)`.
- The expected output path examples omitted ReaR's hostname subdirectory. Updated the examples from `/backup/rear/` to `/backup/rear/$(hostname)/`.
- The ISO validation command used the wrong output path. Updated it to check `/backup/rear/$(hostname)/rear-$(hostname).iso`.
- The `rear dump` and `rear checklayout` descriptions overstated what those commands do. Updated the comments to reflect that `rear dump` shows configuration/system information and `rear checklayout` checks whether the disk layout has changed since the last rescue image or backup.

## Review Notes
- RHEL 9 documentation installs only the `rear` package in its basic procedure, while upstream ReaR notes that ISO output can require ISO-generation tools such as `mkisofs` or `genisoimage`. The post's additional ISO/boot-related packages are plausible for ISO workflows on RHEL-family systems.
- For UEFI Secure Boot systems, RHEL 9 documentation recommends setting `SECURE_BOOT_BOOTLOADER` to the platform shim path. The post does not cover this optional UEFI-specific setting.
