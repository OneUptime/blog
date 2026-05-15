# Validation Summary: How to Implement a 3-2-1 Backup Strategy for RHEL Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- 3-2-1 backup strategy
- rsync
- GNU tar
- OpenSSH
- cron
- Relax-and-Recover (ReaR)
- GNU findutils
- NFS mounts

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Recovering and restoring a system with ReaR: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Red Hat Enterprise Linux 7 documentation: Relax-and-Recover (ReaR): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-relax-and-recover_rear
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- rsync official man page: https://rsync.samba.org/ftp/rsync/rsync.1.html
- GNU findutils documentation and local `find --help`: https://www.gnu.org/software/findutils/
- GNU coreutils `ln` documentation and local `ln --help`: https://www.gnu.org/software/coreutils/ln
- CISA data backup guidance for the 3-2-1 rule: https://www.cisa.gov/sites/default/files/publications/data_backup_options.pdf

## Issues Found
- The local `rsync` example used `-a` without `-A`, `-X`, `-H`, or `--numeric-ids`, so it would not preserve ACLs, extended attributes such as SELinux labels, hard links, or numeric ownership as reliably as a RHEL system backup should. Updated it to `rsync -aAXH --numeric-ids`.
- The first local backup could fail or warn because `--link-dest="${BACKUP_DIR}/latest"` was used even before the `latest` symlink existed. Added a conditional `LINK_DEST` array so `--link-dest` is used only after a prior snapshot exists.
- The local backup did not ensure the host backup directory existed before writing to it. Added `mkdir -p "$BACKUP_DIR"`.
- The local and offsite backup examples could recursively include the mounted NAS path under `/mnt/nas`. Added `/mnt/nas` to the exclude list.
- Updating the `latest` symlink with `ln -snf` can behave unexpectedly when the destination is a symlink to a directory. Changed it to `ln -sfnT` so `latest` is treated as the link name.
- The offsite `tar` example did not preserve ACLs, SELinux context support, or extended attributes. Added `--xattrs --acls --selinux`.
- The offsite `ssh` command wrote to `${REMOTE_DIR}` without creating it first. Added `mkdir -p` before writing the streamed tar archive.
- The local retention example used directory `mtime`, which is unreliable for rsync snapshots because rsync can preserve directory timestamps from the source. Changed cleanup to compare the date-stamped directory names against a date cutoff.
- The offsite retention comment claimed monthly backups were kept for one year, but the command deleted `.tar.gz` files older than 30 days. Updated the comment to match the command.

## Review Notes
- The post remains a high-level example. Production backup scripts should also add locking, monitoring, encryption, restore drills, failure alerting, and ransomware-resistant immutable or offline copies.
- The `rear mkbackup` cron entry is technically valid when ReaR is installed and configured with a backup method such as `NETFS`, but the post does not show `/etc/rear/local.conf` setup.
