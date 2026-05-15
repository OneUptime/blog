# Validation Summary: How to Perform a Bare-Metal Recovery of a RHEL System

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Relax-and-Recover (ReaR)
- GNU tar
- rsync
- cron
- Linux backup and restore practices

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Recovering and restoring a system with ReaR - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- GNU tar manual - https://www.gnu.org/software/tar/manual/tar.html
- rsync official man page - https://rsync.samba.org/ftp/rsync/rsync.1.html
- Local crontab(5), tar --help, and rsync --help output

## Issues Found
- The overview said the post performed bare-metal recovery, but the steps primarily create and test file-level backups. Updated the wording to say the post prepares for bare-metal recovery.
- The guide did not state that tar or rsync backups alone do not recreate disk layout, partitions, boot loaders, and file systems. Added a short clarification that a full bare-metal workflow on RHEL should use ReaR or a tested process for recreating those components.
- The tar backup example did not preserve ACLs, extended attributes, or SELinux contexts explicitly. Added `--acls`, `--xattrs`, and `--selinux` to the tar create command.
- The rsync backup example preserved ACLs and extended attributes but not hard links or numeric user/group IDs. Added `-H` and `--numeric-ids` for a more suitable system backup command.
- The tar restore test did not restore ACLs, extended attributes, SELinux contexts, or permissions explicitly and did not use elevated privileges. Added `sudo`, `--acls`, `--xattrs`, `--selinux`, and `-p`.

## Review Notes
The corrected examples are suitable as backup and file-restore examples, but a production RHEL bare-metal recovery plan should also include a tested ReaR recovery path or equivalent disk-layout and boot-loader reconstruction procedure.
