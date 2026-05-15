# Validation Summary: How to Configure ReaR with Network Backup for Automated RHEL Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Relax-and-Recover (ReaR)
- Red Hat Enterprise Linux (RHEL)
- NFS
- CIFS/Samba
- Cron
- PXE boot recovery
- Linux shell configuration

## Sources Consulted
- ReaR user guide, Basic configuration: https://relax-and-recover.org/rear-user-guide/basics/configuration.html
- ReaR user guide, BACKUP=NETFS example: https://relax-and-recover.org/rear-user-guide/basics/backup_netfs.html
- ReaR upstream default.conf: https://github.com/rear/rear/blob/master/usr/share/rear/conf/default.conf
- Red Hat Enterprise Linux 9 documentation, recovering and restoring a system with ReaR: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Oracle Linux documentation, Managing Backups With ReaR: https://docs.oracle.com/en/operating-systems/oracle-linux/backup/backup-ol-backup-rear-about.html

## Issues Found
- `NETFS_KEEP_OLD_BACKUP_COPY=3` was incorrect. ReaR documents this as a true/false-style setting that keeps the previous backup copy, not a numeric count of three previous copies. Changed it to `NETFS_KEEP_OLD_BACKUP_COPY=y` and updated the comment.
- `OUTPUT_URL` was set separately from `BACKUP_URL` while only `BACKUP_OPTIONS` was configured. ReaR notes that `OUTPUT_OPTIONS` does not inherit `BACKUP_OPTIONS` when `OUTPUT_URL` is explicitly set. Added `OUTPUT_OPTIONS="$BACKUP_OPTIONS"` to the NFS and CIFS examples.
- The CIFS credentials example used `sudo cat > /etc/rear/cifs_credentials`, which does not apply `sudo` to the shell redirection. Replaced it with `sudo tee /etc/rear/cifs_credentials > /dev/null`.
- The example excluded an LVM volume group without showing that its mount points must also be excluded. ReaR documents that mount points for excluded VGs must be listed in `EXCLUDE_MOUNTPOINTS`. Added `/data` to the mountpoint example and a short comment.
- `PXE_TFTP_URL` is deprecated in current ReaR configuration comments in favor of `PXE_TFTP_UPLOAD_URL`. Updated the PXE example accordingly.

## Review Notes
The guide is technically relevant and the core workflow is valid: `rear -v mkbackup`, `rear mkrescue`, `BACKUP=NETFS`, NFS/CIFS `BACKUP_URL`, and cron scheduling are consistent with ReaR documentation. The example still uses placeholder hostnames, share paths, credentials, and mount points that must be adjusted for a real environment.
