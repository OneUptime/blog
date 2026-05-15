# Validation Summary: How to Use ReaR (Relax-and-Recover) for Disaster Recovery on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Relax-and-Recover (ReaR)
- NETFS backups
- NFS backup/output storage
- ISO rescue media
- Linux shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Recovering and restoring a system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Relax-and-Recover (ReaR)": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-relax-and-recover_rear
- Relax-and-Recover User Guide, "Basic configuration": https://relax-and-recover.org/rear-user-guide/basics/configuration.html
- Relax-and-Recover User Guide, "Getting started with ReaR": https://relax-and-recover.org/rear-user-guide/basics/getting-started.html
- ReaR upstream default configuration: https://github.com/rear/rear/blob/master/usr/share/rear/conf/default.conf

## Issues Found
- The NFS example set `BACKUP_OPTIONS="nfsvers=4"` but also set a separate `OUTPUT_URL`. ReaR's upstream default configuration notes that when `OUTPUT_URL` is set, `OUTPUT_OPTIONS` does not inherit `BACKUP_OPTIONS`, so the ISO copy to NFS might not use the intended NFS version. Added `OUTPUT_OPTIONS="nfsvers=4"`.
- The verification command only listed `/backup/rear/`, which applies to the local file example but not necessarily to the NFS example. Updated the comment to clarify that users should check the local path or the configured NFS export.

## Review Notes
The main workflow is consistent with Red Hat documentation: install the `rear` package, configure `/etc/rear/local.conf`, use `rear mkbackup` for rescue media plus a NETFS backup, use `rear mkrescue` for rescue media only, and run `rear recover` from the rescue environment. For production use, users should test booting the rescue media and performing a restore, and should ensure local backup paths are on storage that will remain available during recovery.
