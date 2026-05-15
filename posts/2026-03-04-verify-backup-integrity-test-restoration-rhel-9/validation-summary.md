# Validation Summary: How to Verify Backup Integrity and Test Restoration Procedures on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU tar
- rsync
- cron
- ReaR
- LVM snapshots
- dd

## Sources Consulted
- GNU tar 1.35 manual: https://www.gnu.org/software/tar/manual/tar.html
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- Red Hat Enterprise Linux 9 documentation for LVM snapshots: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9 documentation for Relax-and-Recover (ReaR): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Local `crontab(5)` man page for `/etc/cron.d` system crontab format
- Local GNU tar 1.35 `--help` output
- Local rsync 3.2.7 `--help` output

## Issues Found
- The tar restoration example used `-C /tmp/restore-test` without ensuring that `/tmp/restore-test` exists. GNU tar requires the target directory passed to `-C` to already exist. Added `sudo mkdir -p /tmp/restore-test` before the extraction command so the example works as shown.

## Review Notes
- The tar flags `--acls`, `--xattrs`, and `--selinux` are valid for preserving and restoring ACLs, extended attributes, and SELinux context support.
- The rsync flags `-aAXv` and `--delete` are valid. The `ls -la /backups/latest/` verification is a minimal readability check, not a full integrity comparison; a future improvement could add checksum-based or restore-based validation for rsync backups.
